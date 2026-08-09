import type { CollectionAfterChangeHook } from 'payload'

import type { Appointment } from '@/payload-types'

import { getAppointmentEmailEvents } from './appointmentEmailEvents'
import { queueAppointmentEmail } from './queueAppointmentEmail'

export const queueAppointmentEmails: CollectionAfterChangeHook<Appointment> = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const events = getAppointmentEmailEvents({
    appointment: doc,
    operation,
    previous: previousDoc,
  })

  for (const event of events) {
    await queueAppointmentEmail({
      appointment: doc,
      event,
      idempotencyKey: `appointment-email:${String(doc.id)}:${event}:${doc.updatedAt}`,
      req,
      trigger: 'automatic',
    })
  }

  return doc
}
