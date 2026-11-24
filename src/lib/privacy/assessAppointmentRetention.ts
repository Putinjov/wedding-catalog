import { privacyRetention } from '@/config/privacy'
import type { Appointment, Customer } from '@/payload-types'

export type RetentionDecision =
  | { eligible: true; reason: 'unpaid_cancelled' | 'unpaid_expired' | 'unpaid_completed' }
  | { eligible: false; reason: 'active' | 'recent' | 'payment' | 'review' | 'marketing' | 'customer' | 'invalid_date' }

export function assessAppointmentRetention({
  appointment,
  customer,
  now = new Date(),
}: {
  appointment: Appointment
  customer?: Customer | null
  now?: Date
}): RetentionDecision {
  if (appointment.retentionHold || appointment.needsAdminReview) return { eligible: false, reason: 'review' }
  if (appointment.marketingConsentStatus === 'granted') return { eligible: false, reason: 'marketing' }
  if (
    appointment.paymentStatus !== 'unpaid' && appointment.paymentStatus !== 'failed' ||
    appointment.stripeCheckoutSessionId || appointment.stripePaymentIntentId ||
    appointment.stripeRefundId || appointment.paidAt || appointment.amountPaid != null ||
    appointment.refundStatus || appointment.refundedAt
  ) return { eligible: false, reason: 'payment' }

  if (appointment.customer) {
    if (!customer || customer.orderStatus !== 'none' || customer.purchaseConfirmedAt || customer.orderReference) {
      return { eligible: false, reason: 'customer' }
    }
  }

  if (appointment.status !== 'cancelled' && appointment.status !== 'expired' && appointment.status !== 'completed') {
    return { eligible: false, reason: 'active' }
  }
  const anchor = appointment.status === 'completed' ? appointment.endAt : appointment.status === 'cancelled'
    ? appointment.cancelledAt ?? appointment.updatedAt
    : appointment.updatedAt
  const timestamp = Date.parse(anchor)
  if (!Number.isFinite(timestamp) || !Number.isFinite(now.getTime())) {
    return { eligible: false, reason: 'invalid_date' }
  }
  if (appointment.status === 'completed') {
    const cutoff = new Date(now)
    const day = cutoff.getUTCDate()
    cutoff.setUTCDate(1)
    cutoff.setUTCMonth(cutoff.getUTCMonth() - privacyRetention.completedOperationalMonths)
    const lastDay = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate()
    cutoff.setUTCDate(Math.min(day, lastDay))
    return timestamp <= cutoff.getTime()
      ? { eligible: true, reason: 'unpaid_completed' }
      : { eligible: false, reason: 'recent' }
  }
  const days = appointment.status === 'cancelled'
    ? privacyRetention.cancelledUnpaidDays
    : privacyRetention.abandonedUnpaidDays
  if (now.getTime() - timestamp < days * 86_400_000) return { eligible: false, reason: 'recent' }
  return { eligible: true, reason: appointment.status === 'cancelled' ? 'unpaid_cancelled' : 'unpaid_expired' }
}
