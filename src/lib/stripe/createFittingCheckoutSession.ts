import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type Stripe from 'stripe'

import { isAppointmentSlotValid } from '@/lib/booking/appointmentIntegrity'
import {
  createAppointmentHoldExpiry,
  isAppointmentHoldActive,
} from '@/lib/booking/appointmentHold'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
import { hasAppointmentSlotConflict } from '@/lib/booking/hasAppointmentSlotConflict'
import { appointmentPaymentContext } from '@/lib/booking/paymentIntegrity'
import { getBookingSettings } from '@/lib/booking/settings'
import { getServerSideURL } from '@/utilities/getURL'

import { getStripeClient } from './client'
import {
  fittingProductName,
  getFittingCheckoutDescription,
  getFittingCurrency,
  getFittingFeeCents,
  getSessionExpirationDate,
  isMatchingFittingCheckoutExpiry,
  isMatchingFittingCheckoutSession,
} from './fitting'

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

  if (
    appointment.status !== 'pending_payment' &&
    appointment.status !== 'payment_processing' &&
    appointment.status !== 'payment_failed'
  ) {
    return {
      message: 'This appointment is no longer available for payment.',
      status: 'unavailable',
    }
  }

  const settings = await getBookingSettings()
  const now = new Date()
  if (!isAppointmentHoldActive(appointment, now)) {
    return {
      message: 'This payment hold has expired. Please choose the fitting time again.',
      status: 'unavailable',
    }
  }

  if (!isAppointmentSlotValid(appointment, settings, now)) {
    return {
      message: 'This fitting time is no longer available. Please contact us for help.',
      status: 'unavailable',
    }
  }

  const payload = await getPayload({ config: configPromise })
  if (await hasAppointmentSlotConflict(payload, appointment, settings)) {
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
      isMatchingFittingCheckoutExpiry(existingSession, appointment) &&
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
        stripeCheckoutSessionId: null,
        ...(appointment.status === 'payment_failed'
          ? {}
          : { paymentStatus: 'unpaid' as const, status: 'pending_payment' as const }),
      },
      context: appointmentPaymentContext('checkout-session'),
    })
  }

  const idempotencyKey = `fitting-checkout:${appointmentForCheckout.id}:${appointmentForCheckout.updatedAt}`
  const checkoutExpiry = createAppointmentHoldExpiry(settings.holdMinutes)
  const baseUrl = getCheckoutBaseUrl()
  const session = await stripe.checkout.sessions.create(
    {
      cancel_url: `${baseUrl}/book-a-fitting/payment/cancelled?reference=${encodeURIComponent(appointment.publicReference)}`,
      client_reference_id: appointment.publicReference,
      customer_email: appointment.email,
      expires_at: checkoutExpiry.unixSeconds,
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

  if (
    session.status !== 'open' ||
    !session.url ||
    session.expires_at !== checkoutExpiry.unixSeconds
  ) {
    try {
      if (session.status === 'open') {
        await stripe.checkout.sessions.expire(session.id)
      }
    } catch {
      // A verified late payment is routed to conflict review by the webhook.
    }
    return {
      message: 'Stripe did not create a matching payment hold. Please try again.',
      status: 'unavailable',
    }
  }

  try {
    await payload.update({
      collection: 'appointments',
      id: appointment.id,
      data: {
        checkoutExpiresAt: checkoutExpiry.iso,
        holdExpiresAt: checkoutExpiry.iso,
        paymentStatus: 'processing',
        status: 'payment_processing',
        stripeCheckoutSessionId: session.id,
      },
      context: appointmentPaymentContext('checkout-session'),
    })
  } catch (error) {
    try {
      await stripe.checkout.sessions.expire(session.id)
    } catch {
      // A verified unbound or late payment is routed to conflict review by the webhook.
    }
    throw error
  }

  return { status: 'redirect', url: session.url }
}
