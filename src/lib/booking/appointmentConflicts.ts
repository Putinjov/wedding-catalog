import type { Where } from 'payload'

import type { Appointment } from '@/payload-types'

export function getBlockingAppointmentWhere(now: Date = new Date()): Where {
  return {
    or: [
      { source: { equals: 'admin' } },
      { paymentStatus: { equals: 'paid' } },
      { status: { not_equals: 'pending' } },
      { holdExpiresAt: { greater_than: now.toISOString() } },
    ],
  }
}

export function isAppointmentBlockingSlot(
  appointment: Pick<Appointment, 'holdExpiresAt' | 'paymentStatus' | 'source' | 'status'>,
  now: Date = new Date(),
): boolean {
  if (appointment.status === 'cancelled') return false
  if (appointment.source === 'admin' || appointment.paymentStatus === 'paid') return true
  if (appointment.status !== 'pending') return true
  if (!appointment.holdExpiresAt) return false

  const holdExpiresAt = new Date(appointment.holdExpiresAt)
  return !Number.isNaN(holdExpiresAt.getTime()) && holdExpiresAt > now
}

// TODO: Add a scheduled Payload job to cancel or archive expired unpaid website
// holds. Conflict queries already ignore them, so cleanup is operational only.
