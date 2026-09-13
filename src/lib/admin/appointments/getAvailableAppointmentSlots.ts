import type { PayloadRequest } from 'payload'

import { getSlotDateTimes, parseDateKey } from '@/lib/booking/date'
import { hasAppointmentSlotConflict } from '@/lib/booking/hasAppointmentSlotConflict'
import { getNoticeEligibleSlotTimes } from '@/lib/booking/noticeRules'
import { getBookingSettingsFromPayload } from '@/lib/booking/settings'
import type { Appointment } from '@/payload-types'

import { AdminAppointmentError } from './getCalendarAppointments'

export type AvailableAdminSlot = {
  endAt: string
  label: string
  startAt: string
  time: string
}

export async function getAvailableAppointmentSlots({
  allowNoticeOverride,
  date,
  excludeId,
  req,
}: {
  allowNoticeOverride: boolean
  date: string
  excludeId?: Appointment['id']
  req: PayloadRequest
}): Promise<{ durationMinutes: number; slots: AvailableAdminSlot[]; timezone: string }> {
  if (!parseDateKey(date)) throw new AdminAppointmentError('Choose a valid fitting date.')
  const settings = await getBookingSettingsFromPayload(req.payload, req)
  const candidates = getNoticeEligibleSlotTimes({
    allowNoticeOverride,
    dateKey: date,
    settings,
  })
  const slots = await Promise.all(
    candidates.map(async (time): Promise<AvailableAdminSlot | null> => {
      const slot = getSlotDateTimes(date, time, settings)
      if (!slot) return null
      const appointment = {
        endAt: slot.endAt.toISOString(),
        id: excludeId,
        startAt: slot.startAt.toISOString(),
      }
      const conflict = await hasAppointmentSlotConflict(req.payload, appointment, settings, req)
      if (conflict) return null
      return {
        endAt: appointment.endAt,
        label: time,
        startAt: appointment.startAt,
        time,
      }
    }),
  )

  return {
    durationMinutes: settings.durationMinutes,
    slots: slots.filter((slot): slot is AvailableAdminSlot => slot !== null),
    timezone: settings.timezone,
  }
}
