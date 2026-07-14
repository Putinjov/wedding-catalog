import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Appointment } from '@/payload-types'

type PayloadInstance = Awaited<ReturnType<typeof getPayload>>

export async function hasAppointmentSlotConflict(
  payload: PayloadInstance,
  appointment: Pick<Appointment, 'endAt' | 'id' | 'startAt'>,
): Promise<boolean> {
  const result = await payload.find({
    collection: 'appointments',
    depth: 0,
    limit: 1,
    where: {
      and: [
        {
          id: {
            not_equals: appointment.id,
          },
        },
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
      ],
    },
  })

  return result.docs.length > 0
}

export async function getBookingPayload(): Promise<PayloadInstance> {
  return getPayload({ config: configPromise })
}
