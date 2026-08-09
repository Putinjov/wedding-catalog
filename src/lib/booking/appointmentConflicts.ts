import type { Where } from 'payload'

import type { Appointment } from '@/payload-types'

export function getBlockingAppointmentWhere(now: Date = new Date()): Where {
  return {
    or: [
      { status: { equals: 'confirmed' } },
      { status: { equals: 'payment_processing' } },
      {
        and: [
          { status: { in: ['pending_payment', 'payment_failed'] } },
          {
            or: [
              { source: { equals: 'admin' } },
              { holdExpiresAt: { greater_than: now.toISOString() } },
            ],
          },
        ],
      },
    ],
  }
}

export function isAppointmentBlockingSlot(
  appointment: Pick<Appointment, 'holdExpiresAt' | 'paymentStatus' | 'source' | 'status'>,
  now: Date = new Date(),
): boolean {
  if (appointment.status === 'confirmed' || appointment.status === 'payment_processing') return true
  if (appointment.status !== 'pending_payment' && appointment.status !== 'payment_failed') {
    return false
  }
  if (appointment.source === 'admin') return true
  if (!appointment.holdExpiresAt) return false

  const holdExpiresAt = new Date(appointment.holdExpiresAt)
  return !Number.isNaN(holdExpiresAt.getTime()) && holdExpiresAt > now
}

export function appointmentOverlapsSlot(
  appointment: Pick<Appointment, 'startAt' | 'endAt'>,
  startAt: Date,
  endAt: Date,
  bufferMinutes = 0,
): boolean {
  const appointmentStart = new Date(appointment.startAt).getTime()
  const appointmentEnd = new Date(appointment.endAt).getTime()
  return (
    !Number.isNaN(appointmentStart) &&
    !Number.isNaN(appointmentEnd) &&
    appointmentStart < endAt.getTime() + bufferMinutes * 60 * 1000 &&
    appointmentEnd > startAt.getTime() - bufferMinutes * 60 * 1000
  )
}

// TODO: Add a scheduled Payload job to cancel or archive expired unpaid website
// holds. Conflict queries already ignore them, so cleanup is operational only.
