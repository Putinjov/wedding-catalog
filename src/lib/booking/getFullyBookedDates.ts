'use server'

import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import {
  appointmentOverlapsSlot,
  getBlockingAppointmentWhere,
  isAppointmentBlockingSlot,
} from '@/lib/booking/appointmentConflicts'
import {
  addCalendarDays,
  getBookingDateBounds,
  getConfiguredSlotTimes,
  getSlotDateTimes,
  isClosedDate,
} from '@/lib/booking/date'
import { getBookingSettings } from '@/lib/booking/settings'
import { getBookingNoticeViolation } from '@/lib/booking/noticeRules'
import { consumeRateLimits, ipRateLimitRule } from '@/lib/security/rateLimit'

export type FullyBookedDatesResult =
  | { dates: string[]; success: true }
  | { message: string; success: false }

export async function getFullyBookedDates(): Promise<FullyBookedDatesResult> {
  if (!consumeRateLimits([
    ipRateLimitRule(await headers(), 'fully-booked-dates', 20, 5 * 60 * 1000),
  ])) {
    return { message: 'Calendar availability is temporarily limited. Please try again.', success: false }
  }

  const now = new Date()
  const settings = await getBookingSettings()
  const { minDate, maxDate } = getBookingDateBounds(settings, now)
  const dateKeys: string[] = []
  for (let date = minDate; date <= maxDate; date = addCalendarDays(date, 1) ?? '') {
    if (!date) break
    if (!isClosedDate(date, settings)) dateKeys.push(date)
  }

  const firstSlot = getSlotDateTimes(
    minDate,
    getConfiguredSlotTimes(settings, minDate)[0] ?? settings.weekdayHours.start,
    settings,
  )
  const endDate = addCalendarDays(maxDate, 1)
  const rangeEnd = endDate ? getSlotDateTimes(endDate, '00:00', settings) : null
  if (!firstSlot || !rangeEnd) return { dates: [], success: true }

  const payload = await getPayload({ config: configPromise })
  const existing = await payload.find({
    collection: 'appointments',
    depth: 0,
    limit: 1000,
    pagination: false,
    where: {
      and: [
        { endAt: { greater_than: firstSlot.startAt.toISOString() } },
        { startAt: { less_than: rangeEnd.startAt.toISOString() } },
        { status: { not_equals: 'cancelled' } },
        getBlockingAppointmentWhere(now),
      ],
    },
  })

  const dates = dateKeys.filter((dateKey) =>
    getConfiguredSlotTimes(settings, dateKey).every((time) => {
      const slot = getSlotDateTimes(dateKey, time, settings)
      if (
        !slot ||
        slot.startAt <= now ||
        getBookingNoticeViolation({ dateKey, now, settings, startAt: slot.startAt })
      ) {
        return true
      }
      return existing.docs.some(
        (appointment) =>
          isAppointmentBlockingSlot(appointment, now) &&
          appointmentOverlapsSlot(
            appointment,
            slot.startAt,
            slot.endAt,
            settings.bufferBeforeMinutes + settings.bufferAfterMinutes,
          ),
      )
    }),
  )

  return { dates, success: true }
}
