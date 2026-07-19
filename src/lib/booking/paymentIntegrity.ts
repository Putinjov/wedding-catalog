import { APIError, type FieldAccess, type RequestContext } from 'payload'

import { bookingConfig } from '@/config/booking'
import { siteConfig } from '@/config/site'
import type { Appointment } from '@/payload-types'

export type AppointmentPaymentOrigin =
  | 'admin-create'
  | 'checkout-session'
  | 'internal-maintenance'
  | 'public-booking'
  | 'stripe-webhook'

export type AppointmentPaymentContext = {
  origin: AppointmentPaymentOrigin
  stripeEventType?: string
}

type PaymentRequestContext = {
  appointmentPayment?: AppointmentPaymentContext
}

export const protectedAppointmentFields = [
  'paymentStatus',
  'amountPaid',
  'paidAt',
  'stripeCheckoutSessionId',
  'stripePaymentIntentId',
  'stripeCustomerEmail',
  'paymentFailureReason',
  'checkoutExpiresAt',
  'holdExpiresAt',
  'source',
  'fittingFee',
  'currency',
  'publicReference',
  'slotLock',
  'needsAdminReview',
  'reviewReason',
] as const satisfies readonly (keyof Appointment)[]

export function getAppointmentPaymentContext(
  context: RequestContext | undefined,
): AppointmentPaymentContext | null {
  if (!context) return null
  return (context as PaymentRequestContext).appointmentPayment ?? null
}

export function appointmentPaymentContext(
  origin: AppointmentPaymentOrigin,
  stripeEventType?: string,
): RequestContext {
  return {
    appointmentPayment: {
      origin,
      ...(stripeEventType ? { stripeEventType } : {}),
    },
  }
}

export const protectedAppointmentFieldWrite: FieldAccess = ({ req }) =>
  Boolean(getAppointmentPaymentContext(req.context))

function hasOwnField(data: Partial<Appointment>, field: keyof Appointment): boolean {
  return Object.prototype.hasOwnProperty.call(data, field)
}

function valuesDiffer(left: unknown, right: unknown): boolean {
  return (left ?? null) !== (right ?? null)
}

function isSafeUntrustedCreateField(
  data: Partial<Appointment>,
  field: (typeof protectedAppointmentFields)[number],
): boolean {
  if (field === 'currency') return data.currency === siteConfig.currency
  if (field === 'fittingFee') return data.fittingFee === siteConfig.fittingFee
  if (field === 'paymentStatus') return data.paymentStatus === 'unpaid'
  if (field === 'source') return data.source === 'website'
  if (field === 'needsAdminReview') return data.needsAdminReview === false
  if (field === 'publicReference') {
    return typeof data.publicReference === 'string' && /^fit_[a-f0-9]{32}$/.test(data.publicReference)
  }
  if (field === 'holdExpiresAt' && data.holdExpiresAt) {
    const expiry = new Date(data.holdExpiresAt).getTime()
    const maximum = Date.now() + (bookingConfig.holdMinutes + 1) * 60 * 1000
    return !Number.isNaN(expiry) && expiry <= maximum
  }
  return false
}

export function assertProtectedAppointmentFields({
  data,
  operation,
  originalDoc,
  context,
}: {
  data: Partial<Appointment>
  operation: 'create' | 'update'
  originalDoc?: Appointment
  context?: RequestContext
}): void {
  const paymentContext = getAppointmentPaymentContext(context)

  if (operation === 'create') {
    if (!paymentContext) {
      const unsafeCreate = protectedAppointmentFields.some(
        (field) =>
          hasOwnField(data, field) &&
          !isSafeUntrustedCreateField(data, field),
      )
      if (unsafeCreate || data.paymentStatus === 'paid' || data.source === 'admin') {
        throw new APIError('Server-controlled appointment fields cannot be supplied directly.', 403)
      }
      return
    }

    if (paymentContext.origin === 'public-booking') {
      if (data.paymentStatus !== 'unpaid' || data.source !== 'website') {
        throw new APIError('Public appointments must begin as unpaid website bookings.', 400)
      }
      return
    }

    if (paymentContext.origin === 'admin-create') {
      if (data.paymentStatus !== 'unpaid' || data.source !== 'admin') {
        throw new APIError('Admin appointments must begin unpaid with an admin source.', 400)
      }
      return
    }

    throw new APIError('That internal flow cannot create appointments.', 403)
  }

  if (!originalDoc) {
    throw new APIError('The persisted appointment is required for secure updates.', 400)
  }

  const changedFields = protectedAppointmentFields.filter(
    (field) => hasOwnField(data, field) && valuesDiffer(data[field], originalDoc[field]),
  )
  if (changedFields.length === 0) return

  if (!paymentContext) {
    throw new APIError('Payment and booking-origin fields are server-controlled.', 403)
  }

  if (changedFields.includes('source') || changedFields.includes('publicReference')) {
    throw new APIError('Appointment source and public reference are immutable.', 400)
  }

  if (originalDoc.paymentStatus === 'paid' && data.paymentStatus && data.paymentStatus !== 'paid') {
    const isAuthorisedRefund =
      data.paymentStatus === 'refunded' && paymentContext.origin === 'internal-maintenance'
    if (!isAuthorisedRefund) {
      throw new APIError('A paid appointment cannot be downgraded.', 400)
    }
  }

  if (paymentContext.origin === 'checkout-session') {
    if (data.paymentStatus === 'paid' || data.paymentStatus === 'refunded') {
      throw new APIError('Checkout setup cannot mark an appointment paid or refunded.', 403)
    }
    const checkoutFields = new Set<keyof Appointment>([
      'checkoutExpiresAt',
      'holdExpiresAt',
      'paymentStatus',
      'stripeCheckoutSessionId',
    ])
    if (changedFields.some((field) => !checkoutFields.has(field))) {
      throw new APIError('Checkout setup attempted an unauthorised payment-field change.', 403)
    }
    return
  }

  if (paymentContext.origin === 'stripe-webhook') return
  if (paymentContext.origin === 'internal-maintenance') return

  throw new APIError('That internal flow cannot update payment fields.', 403)
}
