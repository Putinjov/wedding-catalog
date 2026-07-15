import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { hasAppointmentSlotConflict } from '@/lib/booking/hasAppointmentSlotConflict'
import { getBookingPayload } from '@/lib/booking/getBookingPayload'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
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
      status: hasConflict ? appointment.status : 'confirmed',
      stripeCheckoutSessionId: session.id,
      stripeCustomerEmail: getSessionCustomerEmail(session),
      stripePaymentIntentId: getSessionPaymentIntentId(session),
      ...(internalNotes ? { internalNotes } : {}),
    },
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

  try {
    const result = await processSessionEvent(event, event.data.object as Stripe.Checkout.Session)
    if (result === 'retry') {
      return NextResponse.json({ message: 'Appointment is not ready for this payment event.' }, { status: 500 })
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    if (error instanceof InvalidWebhookEvent) {
      return NextResponse.json({ message: 'Invalid fitting payment event.' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Webhook processing failed.' }, { status: 500 })
  }
}
