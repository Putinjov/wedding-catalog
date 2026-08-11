import type { Appointment } from '@/payload-types'

import type { AppointmentEmailEvent } from './types'

type AppointmentEmailState = Pick<
  Appointment,
  | 'endAt'
  | 'needsAdminReview'
  | 'paymentStatus'
  | 'refundStatus'
  | 'startAt'
  | 'status'
>

function getCreatedEvent(appointment: AppointmentEmailState): AppointmentEmailEvent | null {
  if (appointment.paymentStatus === 'refunded' || appointment.paymentStatus === 'partially_refunded') {
    return 'refund'
  }
  if (appointment.status === 'confirmed') return 'confirmed'
  if (appointment.status === 'payment_failed') return 'failed'
  if (appointment.status === 'expired') return 'expired'
  if (appointment.status === 'cancelled') return 'cancelled'
  return null
}

function getUpdatedCustomerEvent(
  appointment: AppointmentEmailState,
  previous: AppointmentEmailState,
): AppointmentEmailEvent | null {
  const paymentChanged = appointment.paymentStatus !== previous.paymentStatus
  const statusChanged = appointment.status !== previous.status
  const scheduleChanged =
    appointment.startAt !== previous.startAt || appointment.endAt !== previous.endAt

  if (
    (paymentChanged &&
      (appointment.paymentStatus === 'refunded' ||
        appointment.paymentStatus === 'partially_refunded')) ||
    (appointment.refundStatus === 'succeeded' && previous.refundStatus !== 'succeeded')
  ) {
    return 'refund'
  }
  if (scheduleChanged && appointment.status === 'confirmed') return 'rescheduled'
  if (statusChanged && appointment.status === 'cancelled') return 'cancelled'
  if (statusChanged && appointment.status === 'confirmed') return 'confirmed'
  if (
    (statusChanged && appointment.status === 'payment_failed') ||
    (paymentChanged && appointment.paymentStatus === 'failed' && appointment.status !== 'cancelled')
  ) {
    return 'failed'
  }
  if (statusChanged && appointment.status === 'expired') return 'expired'
  return null
}

export function getAppointmentEmailEvents({
  appointment,
  operation,
  previous,
}: {
  appointment: AppointmentEmailState
  operation: 'create' | 'update'
  previous?: AppointmentEmailState
}): AppointmentEmailEvent[] {
  const events: AppointmentEmailEvent[] = []
  const customerEvent =
    operation === 'create' || !previous
      ? getCreatedEvent(appointment)
      : getUpdatedCustomerEvent(appointment, previous)

  if (customerEvent) events.push(customerEvent)

  const needsNewAdminAlert =
    appointment.needsAdminReview === true &&
    (operation === 'create' || previous?.needsAdminReview !== true)
  if (needsNewAdminAlert) events.push('admin_alert')

  return events
}

export function shouldDeliverAppointmentEmail(
  event: AppointmentEmailEvent,
  appointment: AppointmentEmailState,
): boolean {
  switch (event) {
    case 'pending':
      // Pending-request notices were intentionally retired. Keep the event type so legacy delivery
      // records remain readable, but never send one after this release.
      return false
    case 'confirmed':
    case 'rescheduled':
      return appointment.status === 'confirmed'
    case 'failed':
      return appointment.status === 'payment_failed' && appointment.paymentStatus === 'failed'
    case 'expired':
      return appointment.status === 'expired'
    case 'cancelled':
      return appointment.status === 'cancelled'
    case 'refund':
      return (
        appointment.paymentStatus === 'refunded' ||
        appointment.paymentStatus === 'partially_refunded'
      )
    case 'admin_alert':
      return appointment.needsAdminReview === true
  }
}
