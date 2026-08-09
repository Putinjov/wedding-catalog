import {
  formatTimeInputValue,
  getDateKey,
  getSlotDateTimes,
  isClosedDate,
  isDateWithinBookingWindow,
  isValidSlotTime,
} from '@/lib/booking/date'
import type { ResolvedBookingSettings } from '@/config/booking'
import type { Appointment } from '@/payload-types'

export type AppointmentSlotDetails = {
  dateKey: string
  endAt: Date
  startAt: Date
  time: string
}

export function getAppointmentSlotDetails(
  appointment: Pick<Appointment, 'startAt' | 'endAt'>,
  settings: ResolvedBookingSettings,
): AppointmentSlotDetails | null {
  const storedStartAt = new Date(appointment.startAt)
  const storedEndAt = new Date(appointment.endAt)
  if (Number.isNaN(storedStartAt.getTime()) || Number.isNaN(storedEndAt.getTime())) {
    return null
  }

  const dateKey = getDateKey(storedStartAt)
  const time = formatTimeInputValue(appointment.startAt)
  if (
    !isDateWithinBookingWindow(dateKey, settings) ||
    isClosedDate(dateKey, settings) ||
    !isValidSlotTime(dateKey, time, settings) ||
    storedStartAt <= new Date()
  ) {
    return null
  }

  const configuredSlot = getSlotDateTimes(dateKey, time, settings)
  if (!configuredSlot) {
    return null
  }

  if (
    configuredSlot.startAt.getTime() !== storedStartAt.getTime() ||
    configuredSlot.endAt.getTime() !== storedEndAt.getTime()
  ) {
    return null
  }

  return {
    dateKey,
    endAt: configuredSlot.endAt,
    startAt: configuredSlot.startAt,
    time,
  }
}

export function isAppointmentSlotValid(
  appointment: Pick<Appointment, 'startAt' | 'endAt'>,
  settings: ResolvedBookingSettings,
): boolean {
  return getAppointmentSlotDetails(appointment, settings) !== null
}
