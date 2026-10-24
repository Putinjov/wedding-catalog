import { createLocalReq, type Payload } from 'payload'

import {
  getAppointmentReminderKey,
  getDayBeforeReminderWindow,
  isDayBeforeReminderDue,
} from '@/lib/notifications/appointmentReminder'
import { queueAppointmentEmail } from '@/lib/notifications/queueAppointmentEmail'

export const appointmentReminderBatchSize = 8

export async function queueDayBeforeAppointmentReminders(
  payload: Payload,
  now: Date = new Date(),
): Promise<{ candidates: number; overflow: boolean }> {
  const { endAt, startAt } = getDayBeforeReminderWindow(now)
  const req = await createLocalReq({}, payload)
  const result = await payload.find({
    collection: 'appointments',
    depth: 0,
    limit: appointmentReminderBatchSize,
    overrideAccess: true,
    req,
    select: { id: true, startAt: true, status: true },
    sort: 'startAt',
    where: {
      and: [
        { status: { equals: 'confirmed' } },
        { startAt: { greater_than_equal: startAt } },
        { startAt: { less_than: endAt } },
      ],
    },
  })

  for (const appointment of result.docs) {
    if (!isDayBeforeReminderDue(appointment, now)) continue
    await queueAppointmentEmail({
      appointment,
      event: 'reminder',
      idempotencyKey: getAppointmentReminderKey(appointment),
      req,
      trigger: 'automatic',
    })
  }

  return { candidates: result.docs.length, overflow: result.hasNextPage }
}
