import type { Payload, TypedUser } from 'payload'

import { toCalendarAppointment, type CalendarAppointment } from './calendarTypes'

const MAX_RANGE_MILLISECONDS = 43 * 24 * 60 * 60 * 1000

export class AdminAppointmentError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'AdminAppointmentError'
    this.status = status
  }
}

export function parseCalendarRange(fromValue: string | null, toValue: string | null) {
  const from = fromValue ? new Date(fromValue) : null
  const to = toValue ? new Date(toValue) : null

  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AdminAppointmentError('A valid visible date range is required.')
  }

  const duration = to.getTime() - from.getTime()
  if (duration <= 0 || duration > MAX_RANGE_MILLISECONDS) {
    throw new AdminAppointmentError('The calendar range must be between one and forty-three days.')
  }

  return { from, to }
}

export async function getCalendarAppointments({
  payload,
  user,
  from,
  to,
}: {
  payload: Payload
  user: TypedUser
  from: Date
  to: Date
}): Promise<CalendarAppointment[]> {
  const result = await payload.find({
    collection: 'appointments',
    depth: 1,
    limit: 1000,
    locale: 'en',
    overrideAccess: false,
    pagination: false,
    sort: 'startAt',
    user,
    where: {
      and: [
        { endAt: { greater_than: from.toISOString() } },
        { startAt: { less_than: to.toISOString() } },
      ],
    },
  })

  return result.docs.flatMap((appointment) => {
    try {
      return [toCalendarAppointment(appointment)]
    } catch {
      console.warn(`[appointments-calendar] Appointment ${appointment.id} has invalid calendar dates.`)
      return []
    }
  })
}
