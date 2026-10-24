import { addCalendarDays, getDateKey, zonedDateTimeToDate } from '@/lib/booking/date'
import type { Appointment } from '@/payload-types'

type ReminderAppointment = Pick<Appointment, 'id' | 'startAt' | 'status'>

export function getDayBeforeReminderWindow(now: Date): {
  endAt: string
  startAt: string
} {
  const tomorrow = addCalendarDays(getDateKey(now), 1)
  const dayAfter = tomorrow && addCalendarDays(tomorrow, 1)
  const startAt = tomorrow && zonedDateTimeToDate(tomorrow, '00:00')
  const endAt = dayAfter && zonedDateTimeToDate(dayAfter, '00:00')
  if (!startAt || !endAt) throw new Error('Unable to resolve the Dublin reminder window.')

  return { endAt: endAt.toISOString(), startAt: startAt.toISOString() }
}

export function isDayBeforeReminderDue(
  appointment: Pick<ReminderAppointment, 'startAt' | 'status'>,
  now: Date,
): boolean {
  if (appointment.status !== 'confirmed') return false
  const startAt = new Date(appointment.startAt)
  if (Number.isNaN(startAt.getTime())) return false

  const tomorrow = addCalendarDays(getDateKey(now), 1)
  return tomorrow !== null && getDateKey(startAt) === tomorrow
}

export function getAppointmentReminderKey(
  appointment: Pick<ReminderAppointment, 'id' | 'startAt'>,
): string {
  return `appointment-email:${String(appointment.id)}:reminder:${appointment.startAt}`
}
