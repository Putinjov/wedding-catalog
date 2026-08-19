import type { Appointment } from '@/payload-types'

import { isAppointmentHoldActive } from './appointmentHold'

export const bookingSuccessStateValues = [
  'confirmed',
  'processing',
  'expired',
  'conflict',
  'failed',
] as const

export type BookingSuccessState = (typeof bookingSuccessStateValues)[number]

type CheckoutSnapshot = {
  belongsToAppointment: boolean
  paymentStatus?: null | string
  status?: null | string
}

const holdLifecycleStatuses = new Set<Appointment['status']>([
  'pending_payment',
  'payment_processing',
  'payment_failed',
])

export function getBookingSuccessState({
  appointment,
  checkout,
  now = new Date(),
}: {
  appointment: Appointment
  checkout: CheckoutSnapshot
  now?: Date
}): BookingSuccessState {
  if (!checkout.belongsToAppointment) return 'failed'

  if (appointment.paymentStatus === 'paid' && appointment.status === 'confirmed') {
    return 'confirmed'
  }
  if (
    appointment.paymentStatus === 'paid' &&
    appointment.status === 'payment_received_conflict'
  ) {
    return 'conflict'
  }

  const holdExpired =
    appointment.source === 'website' &&
    holdLifecycleStatuses.has(appointment.status) &&
    !isAppointmentHoldActive(appointment, now)
  if (appointment.status === 'expired' || checkout.status === 'expired' || holdExpired) {
    return 'expired'
  }

  if (appointment.status === 'payment_failed' || appointment.paymentStatus === 'failed') {
    return 'failed'
  }

  if (
    appointment.status === 'payment_processing' ||
    appointment.paymentStatus === 'processing' ||
    checkout.paymentStatus === 'paid' ||
    checkout.status === 'complete'
  ) {
    return 'processing'
  }

  return 'failed'
}
