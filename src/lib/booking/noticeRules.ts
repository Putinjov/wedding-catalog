import type { ResolvedBookingSettings } from '@/config/booking'
import {
  addCalendarDays,
  formatTimeInputValue,
  getConfiguredSlotTimes,
  getDateKey,
  getSlotDateTimes,
} from '@/lib/booking/date'

export type BookingNoticeViolation = 'minimum-notice' | 'next-day-cutoff'

export const ADMIN_NOTICE_OVERRIDE_WARNING =
  'This bypasses the minimum notice and next-day cutoff only. Closed dates, blocked times, the booking window, and appointment conflicts remain enforced.'

export function getBookingNoticeViolation({
  dateKey,
  now = new Date(),
  settings,
  startAt,
}: {
  dateKey: string
  now?: Date
  settings: ResolvedBookingSettings
  startAt: Date
}): BookingNoticeViolation | null {
  if (settings.minimumNoticeHours === 0 && !settings.nextDayCutoffTime) return null

  if (settings.nextDayCutoffTime) {
    const tomorrow = addCalendarDays(getDateKey(now), 1)
    if (
      dateKey === tomorrow &&
      formatTimeInputValue(now.toISOString()) >= settings.nextDayCutoffTime
    ) {
      return 'next-day-cutoff'
    }
  }

  const minimumStartAt = now.getTime() + settings.minimumNoticeHours * 60 * 60 * 1000
  return startAt.getTime() < minimumStartAt ? 'minimum-notice' : null
}

export function getBookingNoticeMessage(
  violation: BookingNoticeViolation,
  settings: ResolvedBookingSettings,
): string {
  if (violation === 'next-day-cutoff') {
    return `Next-day bookings close at ${settings.nextDayCutoffTime} Europe/Dublin.`
  }

  const unit = settings.minimumNoticeHours === 1 ? "hour's" : "hours'"
  return `Bookings require at least ${settings.minimumNoticeHours} ${unit} notice.`
}

export function getBookingNoticeLabel(settings: ResolvedBookingSettings): string {
  const labels: string[] = []
  if (settings.minimumNoticeHours > 0) {
    labels.push(getBookingNoticeMessage('minimum-notice', settings))
  }
  if (settings.nextDayCutoffTime) {
    labels.push(getBookingNoticeMessage('next-day-cutoff', settings))
  }
  return labels.join(' ')
}

export function getNoticeEligibleSlotTimes({
  allowNoticeOverride = false,
  dateKey,
  now = new Date(),
  settings,
}: {
  allowNoticeOverride?: boolean
  dateKey: string
  now?: Date
  settings: ResolvedBookingSettings
}): string[] {
  return getConfiguredSlotTimes(settings, dateKey).filter((time) => {
    const slot = getSlotDateTimes(dateKey, time, settings)
    if (!slot || slot.startAt <= now) return false
    return (
      allowNoticeOverride ||
      getBookingNoticeViolation({ dateKey, now, settings, startAt: slot.startAt }) === null
    )
  })
}
