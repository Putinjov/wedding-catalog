import type Stripe from 'stripe'

import { formatDateTimeForCustomer } from '@/lib/booking/date'
import type { Appointment } from '@/payload-types'

export const fittingProductName = 'CAIT Bridal private fitting'

export function getFittingFeeCents(appointment: Pick<Appointment, 'fittingFee'>): number | null {
  if (
    !Number.isFinite(appointment.fittingFee) ||
    appointment.fittingFee <= 0 ||
    !Number.isInteger(appointment.fittingFee * 100)
  ) {
    return null
  }

  return Math.round(appointment.fittingFee * 100)
}

export function getFittingCurrency(appointment: Pick<Appointment, 'currency'>): string | null {
  if (appointment.currency !== 'EUR') {
    return null
  }

  return appointment.currency.toLowerCase()
}

export function getFittingCheckoutDescription(
  appointment: Pick<Appointment, 'publicReference' | 'startAt'>,
): string {
  return `Private fitting · ${formatDateTimeForCustomer(appointment.startAt)} · Ref ${appointment.publicReference}`
}

export function isMatchingFittingCheckoutSession(
  session: Stripe.Checkout.Session,
  appointment: Pick<Appointment, 'currency' | 'fittingFee' | 'id' | 'publicReference'>,
): boolean {
  const amountCents = getFittingFeeCents(appointment)
  const currency = getFittingCurrency(appointment)
  if (amountCents === null || currency === null) {
    return false
  }

  return (
    session.mode === 'payment' &&
    session.client_reference_id === appointment.publicReference &&
    session.metadata?.appointmentId === String(appointment.id) &&
    session.metadata?.publicReference === appointment.publicReference &&
    session.amount_total === amountCents &&
    session.currency === currency
  )
}

function getStripeObjectId(
  value: string | Stripe.Customer | Stripe.PaymentIntent | null,
): string | null {
  return typeof value === 'string' ? value : value?.id ?? null
}

export function getSessionPaymentIntentId(session: Stripe.Checkout.Session): string | null {
  return getStripeObjectId(session.payment_intent)
}

export function getSessionCustomerEmail(session: Stripe.Checkout.Session): string | null {
  return session.customer_details?.email ?? session.customer_email ?? null
}

export function getSessionExpirationDate(session: Stripe.Checkout.Session): Date | null {
  return session.expires_at ? new Date(session.expires_at * 1000) : null
}
