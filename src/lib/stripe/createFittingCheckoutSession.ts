import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type Stripe from 'stripe'

import { isAppointmentSlotValid } from '@/lib/booking/appointmentIntegrity'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
import { hasAppointmentSlotConflict } from '@/lib/booking/hasAppointmentSlotConflict'
import { appointmentPaymentContext } from '@/lib/booking/paymentIntegrity'
import { getServerSideURL } from '@/utilities/getURL'

import { getStripeClient } from './client'
import {
  fittingProductName,
  getFittingCheckoutDescription,
  getFittingCurrency,
  getFittingFeeCents,
  getSessionExpirationDate,
  isMatchingFittingCheckoutSession,
} from './fitting'

const checkoutLifetimeSeconds = 60 * 60

export type CreateFittingCheckoutResult =
  | { status: 'paid' }
  | { status: 'processing' }
  | { status: 'redirect'; url: string }
  | { status: 'unavailable'; message: string }
  | { status: 'not-found' }

function getCheckoutBaseUrl(): string {
  return getServerSideURL().replace(/\/+$/, '')
}

export async function createFittingCheckoutSession(
  reference: string,
): Promise<CreateFittingCheckoutResult> {
  const appointment = await getAppointmentByReference(reference)
  if (!appointment) {
    return { status: 'not-found' }
  }

  if (appointment.paymentStatus === 'paid') {
    return { status: 'paid' }
  }

  if (appointment.status !== 'pending') {
    return {
      message: 'This appointment is no longer available for payment.',
      status: 'unavailable',
    }
  }

  if (!isAppointmentSlotValid(appointment)) {
    return {
      message: 'This fitting time is no longer available. Please contact us for help.',
      status: 'unavailable',
    }
  }

  const payload = await getPayload({ config: configPromise })
  if (await hasAppointmentSlotConflict(payload, appointment)) {
    return {
      message: 'This fitting time is no longer available. Please contact us for help.',
      status: 'unavailable',
    }
  }

  const amountCents = getFittingFeeCents(appointment)
  const currency = getFittingCurrency(appointment)
  if (amountCents === null || currency === null) {
    return {
      message: 'This fitting fee is not configured for online payment.',
      status: 'unavailable',
    }
  }

  const stripe = getStripeClient()
  let appointmentForCheckout = appointment
  if (appointment.stripeCheckoutSessionId) {
    let existingSession: Stripe.Checkout.Session
    try {
      existingSession = await stripe.checkout.sessions.retrieve(
        appointment.stripeCheckoutSessionId,
      )
    } catch {
      return {
        message: 'We could not check the existing payment session. Please try again shortly.',
        status: 'unavailable',
      }
    }

    const matchesAppointment = isMatchingFittingCheckoutSession(existingSession, appointment)
    if (
      matchesAppointment &&
      existingSession.status === 'open' &&
      existingSession.url &&
      (getSessionExpirationDate(existingSession)?.getTime() ?? 0) > Date.now()
    ) {
      return { status: 'redirect', url: existingSession.url }
    }

    if (
      matchesAppointment &&
      existingSession.status === 'complete' &&
      appointment.paymentStatus !== 'failed'
    ) {
      return { status: 'processing' }
    }

    if (existingSession.status === 'open') {
      try {
        await stripe.checkout.sessions.expire(existingSession.id)
      } catch {
        return {
          message: 'The existing payment session is still active. Please try again shortly.',
          status: 'unavailable',
        }
      }
    }

    appointmentForCheckout = await payload.update({
      collection: 'appointments',
      id: appointment.id,
      data: {
        checkoutExpiresAt: null,
        paymentStatus: 'unpaid',
        stripeCheckoutSessionId: null,
      },
      context: appointmentPaymentContext('checkout-session'),
    })
  }

  const idempotencyKey = `fitting-checkout:${appointmentForCheckout.id}:${appointmentForCheckout.updatedAt}`
  const checkoutExpiresAt = Math.floor(Date.now() / 1000) + checkoutLifetimeSeconds
  const baseUrl = getCheckoutBaseUrl()
  const session = await stripe.checkout.sessions.create(
    {
      cancel_url: `${baseUrl}/book-a-fitting/payment/cancelled?reference=${encodeURIComponent(appointment.publicReference)}`,
      client_reference_id: appointment.publicReference,
      customer_email: appointment.email,
      expires_at: checkoutExpiresAt,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              description: getFittingCheckoutDescription(appointment),
              name: fittingProductName,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        appointmentId: String(appointment.id),
        publicReference: appointment.publicReference,
      },
      mode: 'payment',
      submit_type: 'book',
      success_url: `${baseUrl}/book-a-fitting/payment/success?reference=${encodeURIComponent(appointment.publicReference)}&session_id={CHECKOUT_SESSION_ID}`,
    },
    {
      idempotencyKey,
    },
  )

  if (!session.url) {
    return {
      message: 'Stripe did not return a Checkout URL. Please try again.',
      status: 'unavailable',
    }
  }

  await payload.update({
    collection: 'appointments',
    id: appointment.id,
    data: {
      checkoutExpiresAt: new Date(checkoutExpiresAt * 1000).toISOString(),
      holdExpiresAt: new Date(checkoutExpiresAt * 1000).toISOString(),
      paymentStatus: 'pending',
      stripeCheckoutSessionId: session.id,
    },
    context: appointmentPaymentContext('checkout-session'),
  })

  return { status: 'redirect', url: session.url }
}
