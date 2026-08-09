import type { Payload, PayloadRequest, Where } from 'payload'

import type { Appointment } from '@/payload-types'
import type { ResolvedBookingSettings } from '@/config/booking'
import { getBlockingAppointmentWhere } from '@/lib/booking/appointmentConflicts'

export async function hasAppointmentSlotConflict(
  payload: Payload,
  appointment: Pick<Appointment, 'endAt' | 'startAt'> & { id?: Appointment['id'] },
  settings: ResolvedBookingSettings,
  req?: PayloadRequest,
): Promise<boolean> {
  const totalBufferMinutes = settings.bufferBeforeMinutes + settings.bufferAfterMinutes
  const conflictStart = new Date(
    new Date(appointment.startAt).getTime() - totalBufferMinutes * 60 * 1000,
  ).toISOString()
  const conflictEnd = new Date(
    new Date(appointment.endAt).getTime() + totalBufferMinutes * 60 * 1000,
  ).toISOString()
  const conditions: Where[] = [
    {
      endAt: {
        greater_than: conflictStart,
      },
    },
    {
      startAt: {
        less_than: conflictEnd,
      },
    },
    {
      status: {
        not_equals: 'cancelled',
      },
    },
    getBlockingAppointmentWhere(),
  ]

  if (appointment.id) {
    conditions.unshift({
      id: {
        not_equals: appointment.id,
      },
    })
  }

  const result = await payload.find({
    collection: 'appointments',
    depth: 0,
    limit: 1,
    ...(req ? { req } : {}),
    where: {
      and: conditions,
    },
  })

  return result.docs.length > 0
}
