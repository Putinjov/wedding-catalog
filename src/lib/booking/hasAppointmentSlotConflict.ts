import type { Payload, Where } from 'payload'

import type { Appointment } from '@/payload-types'
import { getBlockingAppointmentWhere } from '@/lib/booking/appointmentConflicts'

export async function hasAppointmentSlotConflict(
  payload: Payload,
  appointment: Pick<Appointment, 'endAt' | 'startAt'> & { id?: Appointment['id'] },
): Promise<boolean> {
  const conditions: Where[] = [
    {
      endAt: {
        greater_than: appointment.startAt,
      },
    },
    {
      startAt: {
        less_than: appointment.endAt,
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
    where: {
      and: conditions,
    },
  })

  return result.docs.length > 0
}
