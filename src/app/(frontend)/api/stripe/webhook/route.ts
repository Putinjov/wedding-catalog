import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { hasAppointmentSlotConflict } from '@/lib/booking/hasAppointmentSlotConflict'
import { getBookingPayload } from '@/lib/booking/getBookingPayload'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
import { appointmentPaymentContext } from '@/lib/booking/paymentIntegrity'
import { getStripeClient } from '@/lib/stripe/client'
import {
  getSessionCustomerEmail,
  getSessionPaymentIntentId,
  isMatchingFittingCheckoutSession,
} from '@/lib/stripe/fitting'

export const dynamic = 'force-dynamic'

const conflictNotice =
  'Stripe fitting payment received; appointment slot conflict detected. Admin review required.'

class InvalidWebhookEvent extends Error {}
class StripeEventInProgress extends Error {}

type ClaimedEvent = { id: number | string }

type SupportedEvent =
  | 'checkout.session.async_payment_failed'
  | 'checkout.session.async_payment_succeeded'
  | 'checkout.session.completed'
  | 'checkout.session.expired'

function isSupportedEvent(type: string): type is SupportedEvent {
  return (
    type === 'checkout.session.async_payment_failed' ||
    type === 'checkout.session.async_payment_succeeded' ||
    type === 'checkout.session.completed' ||
    type === 'checkout.session.expired'
  )
}

function getMetadataValue(session: Stripe.Checkout.Session, key: string): string | null {
  const value = session.metadata?.[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

async function getAppointmentForSession(session: Stripe.Checkout.Session) {
  const appointmentId = getMetadataValue(session, 'appointmentId')
  const publicReference = getMetadataValue(session, 'publicReference')
  if (!appointmentId || !publicReference) {
    throw new InvalidWebhookEvent('Missing appointment metadata.')
  }

  const appointment = await getAppointmentByReference(publicReference)
  if (!appointment || String(appointment.id) !== appointmentId) {
    throw new InvalidWebhookEvent('Appointment metadata does not match.')
  }

  return appointment
}

async function markAppointmentPaid(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  appointment: Awaited<ReturnType<typeof getAppointmentForSession>>,
): Promise<void> {
  if (session.amount_total === null) {
    throw new InvalidWebhookEvent('Missing payment amount.')
  }

  const payload = await getBookingPayload()
  const hasConflict = await hasAppointmentSlotConflict(payload, appointment)
  const existingNotes = appointment.internalNotes?.trim() ?? ''
  const internalNotes =
    hasConflict && !existingNotes.includes(conflictNotice)
      ? [existingNotes, conflictNotice].filter(Boolean).join('\n')
      : undefined

  await payload.update({
    collection: 'appointments',
    id: appointment.id,
    data: {
      amountPaid: session.amount_total,
      paidAt: new Date(event.created * 1000).toISOString(),
      paymentFailureReason: null,
      paymentStatus: 'paid',
      needsAdminReview: hasConflict,
      reviewReason: hasConflict ? conflictNotice : null,
      status: hasConflict ? appointment.status : 'confirmed',
      stripeCheckoutSessionId: session.id,
      stripeCustomerEmail: getSessionCustomerEmail(session),
      stripePaymentIntentId: getSessionPaymentIntentId(session),
      ...(internalNotes ? { internalNotes } : {}),
    },
    context: appointmentPaymentContext('stripe-webhook', event.type),
  })
}

async function claimStripeEvent(event: Stripe.Event): Promise<ClaimedEvent | null> {
  const payload = await getBookingPayload()
  const existing = await payload.find({
    collection: 'processed-stripe-events',
    depth: 0,
    limit: 1,
    where: { eventId: { equals: event.id } },
  })
  const record = existing.docs[0]

  if (record?.status === 'processed') return null
  if (record?.status === 'processing') {
    const staleAt = new Date(record.updatedAt).getTime() + 5 * 60 * 1000
    if (staleAt > Date.now()) throw new StripeEventInProgress()
  }

  if (record) {
    return payload.update({
      collection: 'processed-stripe-events',
      id: record.id,
      data: { failureReason: null, status: 'processing' },
      overrideAccess: true,
    })
  }

  try {
    return await payload.create({
      collection: 'processed-stripe-events',
      data: {
        eventId: event.id,
        eventType: event.type,
        status: 'processing',
      },
      overrideAccess: true,
    })
  } catch (error) {
    if (error instanceof Error && /duplicate|unique/i.test(error.message)) {
      throw new StripeEventInProgress()
    }
    throw error
  }
}

async function finishStripeEvent(
  claim: ClaimedEvent,
  status: 'failed' | 'processed',
  appointment?: Awaited<ReturnType<typeof getAppointmentForSession>>,
): Promise<void> {
  const payload = await getBookingPayload()
  await payload.update({
    collection: 'processed-stripe-events',
    id: claim.id,
    data: {
      appointment: appointment?.id,
      failureReason: status === 'failed' ? 'Webhook processing failed; safe to retry.' : null,
      processedAt: status === 'processed' ? new Date().toISOString() : null,
      status,
    },
    overrideAccess: true,
  })
}

async function processSessionEvent(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<'ignored' | 'processed' | 'retry'> {
  const appointment = await getAppointmentForSession(session)
  if (!isMatchingFittingCheckoutSession(session, appointment)) {
    throw new InvalidWebhookEvent('Checkout Session does not match the fitting appointment.')
  }

  if (appointment.stripeCheckoutSessionId !== session.id) {
    if (
      !appointment.stripeCheckoutSessionId &&
      event.type === 'checkout.session.expired' &&
      appointment.paymentStatus === 'unpaid'
    ) {
      return 'processed'
    }
    return appointment.stripeCheckoutSessionId ? 'ignored' : 'retry'
  }

  if (appointment.paymentStatus === 'paid') {
    return 'processed'
  }

  const payload = await getBookingPayload()
  switch (event.type) {
    case 'checkout.session.completed':
      if (session.status !== 'complete') {
        throw new InvalidWebhookEvent('Checkout Session is not complete.')
      }
      if (session.payment_status === 'paid') {
        await markAppointmentPaid(event, session, appointment)
      } else {
        await payload.update({
          collection: 'appointments',
          id: appointment.id,
          data: {
            paymentFailureReason: null,
            paymentStatus: 'pending',
          },
          context: appointmentPaymentContext('stripe-webhook', event.type),
        })
      }
      return 'processed'
    case 'checkout.session.async_payment_succeeded':
      if (session.payment_status !== 'paid') {
        throw new InvalidWebhookEvent('Async payment is not marked paid.')
      }
      await markAppointmentPaid(event, session, appointment)
      return 'processed'
    case 'checkout.session.async_payment_failed':
      await payload.update({
        collection: 'appointments',
        id: appointment.id,
        data: {
          paymentFailureReason: 'Stripe reported an asynchronous fitting payment failure.',
          paymentStatus: 'failed',
          stripeCustomerEmail: getSessionCustomerEmail(session),
          stripePaymentIntentId: getSessionPaymentIntentId(session),
        },
        context: appointmentPaymentContext('stripe-webhook', event.type),
      })
      return 'processed'
    case 'checkout.session.expired':
      if (session.status !== 'expired') {
        throw new InvalidWebhookEvent('Checkout Session is not expired.')
      }
      await payload.update({
        collection: 'appointments',
        id: appointment.id,
        data: {
          checkoutExpiresAt: null,
          paymentFailureReason: null,
          paymentStatus: 'unpaid',
          stripeCheckoutSessionId: null,
        },
        context: appointmentPaymentContext('stripe-webhook', event.type),
      })
      return 'processed'
  }

  throw new InvalidWebhookEvent('Unsupported fitting payment event.')
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')
  if (!webhookSecret || !signature) {
    return NextResponse.json({ message: 'Webhook is not configured.' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return NextResponse.json({ message: 'Invalid webhook signature.' }, { status: 400 })
  }

  if (!isSupportedEvent(event.type)) {
    return NextResponse.json({ received: true })
  }

  let claim: ClaimedEvent | null = null
  try {
    claim = await claimStripeEvent(event)
    if (!claim) return NextResponse.json({ received: true })

    const appointment = await getAppointmentForSession(
      event.data.object as Stripe.Checkout.Session,
    )
    const result = await processSessionEvent(event, event.data.object as Stripe.Checkout.Session)
    if (result === 'retry') {
      await finishStripeEvent(claim, 'failed', appointment)
      return NextResponse.json({ message: 'Appointment is not ready for this payment event.' }, { status: 500 })
    }
    await finishStripeEvent(claim, 'processed', appointment)
    return NextResponse.json({ received: true })
  } catch (error) {
    if (claim) await finishStripeEvent(claim, 'failed')
    if (error instanceof InvalidWebhookEvent) {
      return NextResponse.json({ message: 'Invalid fitting payment event.' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Webhook processing failed.' }, { status: 500 })
  }
}
