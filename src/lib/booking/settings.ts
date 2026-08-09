import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload, type Payload, type PayloadRequest } from 'payload'

import {
  BOOKING_TIMEZONE,
  defaultBookingSettings,
  MAXIMUM_BOOKING_HOLD_MINUTES,
  STRIPE_CHECKOUT_MINIMUM_HOLD_MINUTES,
  type BookingBlockedInterval,
  type BookingDateRange,
  type BookingHours,
  type BookingLunchBreak,
  type ResolvedBookingSettings,
} from '@/config/booking'

type UnknownRecord = Record<string, unknown>

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null
}

function readInteger(
  record: UnknownRecord,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = record[name] ?? fallback
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`)
  }
  return value as number
}

function readTime(value: unknown, name: string, fallback?: string): string {
  const resolved = value ?? fallback
  if (typeof resolved !== 'string' || !timePattern.test(resolved)) {
    throw new Error(`${name} must use 24-hour HH:mm format.`)
  }
  return resolved
}

function readDate(value: unknown, name: string): string {
  if (typeof value !== 'string' || !datePattern.test(value)) {
    throw new Error(`${name} must use YYYY-MM-DD format.`)
  }

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${name} must be a valid calendar date.`)
  }
  return value
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function readHours(
  value: unknown,
  name: string,
  fallback: BookingHours,
  durationMinutes: number,
): BookingHours {
  const record = asRecord(value) ?? {}
  const start = readTime(record.start, `${name}.start`, fallback.start)
  const end = readTime(record.end, `${name}.end`, fallback.end)
  if (timeToMinutes(end) - timeToMinutes(start) < durationMinutes) {
    throw new Error(`${name} must contain at least one complete fitting slot.`)
  }
  return { end, start }
}

function readArray(value: unknown, name: string, maximum: number): unknown[] {
  if (value == null) return []
  if (!Array.isArray(value) || value.length > maximum) {
    throw new Error(`${name} must contain no more than ${maximum} entries.`)
  }
  return value
}

function readWeekdays(value: unknown, name: string): number[] {
  const entries = readArray(value, name, 7).map((entry) =>
    typeof entry === 'string' ? Number(entry) : entry,
  )
  if (
    entries.some((entry) => !Number.isInteger(entry) || (entry as number) < 0 || (entry as number) > 6)
  ) {
    throw new Error(`${name} must contain valid weekdays.`)
  }
  const weekdays = entries as number[]
  if (new Set(weekdays).size !== weekdays.length) {
    throw new Error(`${name} cannot contain duplicate weekdays.`)
  }
  return weekdays
}

function readLunchBreaks(value: unknown): BookingLunchBreak[] {
  return readArray(value, 'lunchBreaks', 20).map((entry, index) => {
    const record = asRecord(entry)
    if (!record) throw new Error(`lunchBreaks.${index} is invalid.`)
    const start = readTime(record.start, `lunchBreaks.${index}.start`)
    const end = readTime(record.end, `lunchBreaks.${index}.end`)
    if (timeToMinutes(start) >= timeToMinutes(end)) {
      throw new Error(`lunchBreaks.${index} must end after it starts.`)
    }
    const weekdays = readWeekdays(record.weekdays, `lunchBreaks.${index}.weekdays`)
    if (weekdays.length === 0) {
      throw new Error(`lunchBreaks.${index} must apply to at least one weekday.`)
    }
    return { end, start, weekdays }
  })
}

function readDateRanges(value: unknown): BookingDateRange[] {
  return readArray(value, 'closures', 100).map((entry, index) => {
    const record = asRecord(entry)
    if (!record) throw new Error(`closures.${index} is invalid.`)
    const startDate = readDate(record.startDate, `closures.${index}.startDate`)
    const endDate = readDate(record.endDate, `closures.${index}.endDate`)
    if (startDate > endDate) {
      throw new Error(`closures.${index} must end on or after its start date.`)
    }
    return { endDate, startDate }
  })
}

function readBlockedIntervals(value: unknown): BookingBlockedInterval[] {
  return readArray(value, 'blockedIntervals', 250).map((entry, index) => {
    const record = asRecord(entry)
    if (!record) throw new Error(`blockedIntervals.${index} is invalid.`)
    const date = readDate(record.date, `blockedIntervals.${index}.date`)
    const start = readTime(record.start, `blockedIntervals.${index}.start`)
    const end = readTime(record.end, `blockedIntervals.${index}.end`)
    if (timeToMinutes(start) >= timeToMinutes(end)) {
      throw new Error(`blockedIntervals.${index} must end after it starts.`)
    }
    return { date, end, start }
  })
}

function assertBreaksFitOpeningHours(settings: ResolvedBookingSettings): void {
  for (const [index, lunchBreak] of settings.lunchBreaks.entries()) {
    for (const weekday of lunchBreak.weekdays) {
      const hours = weekday === 6 ? settings.saturdayHours : settings.weekdayHours
      if (
        settings.closedWeekdays.includes(weekday) ||
        weekday === 0 ||
        (weekday === 6 && !settings.saturdayHours.enabled)
      ) {
        throw new Error(`lunchBreaks.${index} cannot target a closed weekday.`)
      }
      if (
        timeToMinutes(lunchBreak.start) < timeToMinutes(hours.start) ||
        timeToMinutes(lunchBreak.end) > timeToMinutes(hours.end)
      ) {
        throw new Error(`lunchBreaks.${index} must fit within opening hours.`)
      }
    }
  }

  for (let weekday = 0; weekday <= 6; weekday += 1) {
    const ranges = settings.lunchBreaks
      .filter((lunchBreak) => lunchBreak.weekdays.includes(weekday))
      .map((lunchBreak) => ({
        end: timeToMinutes(lunchBreak.end),
        start: timeToMinutes(lunchBreak.start),
      }))
      .sort((left, right) => left.start - right.start)
    if (ranges.some((range, index) => index > 0 && range.start < ranges[index - 1].end)) {
      throw new Error('lunchBreaks cannot overlap on the same weekday.')
    }
  }
}

export function resolveBookingSettings(value: unknown): ResolvedBookingSettings {
  const record = asRecord(value) ?? {}
  const durationMinutes = readInteger(record, 'durationMinutes', 60, 15, 240)
  const weekdayHours = readHours(
    record.weekdayHours,
    'weekdayHours',
    defaultBookingSettings.weekdayHours,
    durationMinutes,
  )
  const saturdayRecord = asRecord(record.saturdayHours) ?? {}
  const saturdayBase = readHours(
    saturdayRecord,
    'saturdayHours',
    defaultBookingSettings.saturdayHours,
    durationMinutes,
  )
  const saturdayEnabled = saturdayRecord.enabled ?? defaultBookingSettings.saturdayHours.enabled
  if (typeof saturdayEnabled !== 'boolean') {
    throw new Error('saturdayHours.enabled must be true or false.')
  }
  const timezone = record.timezone ?? BOOKING_TIMEZONE
  if (timezone !== BOOKING_TIMEZONE) {
    throw new Error(`timezone must remain ${BOOKING_TIMEZONE}.`)
  }
  const nextDayCutoff = record.nextDayCutoffTime
  const nextDayCutoffTime =
    nextDayCutoff == null || nextDayCutoff === ''
      ? null
      : readTime(nextDayCutoff, 'nextDayCutoffTime')

  const settings: ResolvedBookingSettings = {
    blockedIntervals: readBlockedIntervals(record.blockedIntervals),
    bookingWindowDays: readInteger(record, 'bookingWindowDays', 60, 1, 365),
    bufferAfterMinutes: readInteger(record, 'bufferAfterMinutes', 0, 0, 180),
    bufferBeforeMinutes: readInteger(record, 'bufferBeforeMinutes', 0, 0, 180),
    closedWeekdays: readWeekdays(record.closedWeekdays ?? ['0', '1'], 'closedWeekdays'),
    closures: readDateRanges(record.closures),
    durationMinutes,
    holdMinutes: readInteger(
      record,
      'holdMinutes',
      30,
      STRIPE_CHECKOUT_MINIMUM_HOLD_MINUTES,
      MAXIMUM_BOOKING_HOLD_MINUTES,
    ),
    holidays: readArray(record.holidays, 'holidays', 200).map((entry, index) => {
      const holiday = asRecord(entry)
      return readDate(holiday?.date ?? entry, `holidays.${index}.date`)
    }),
    lunchBreaks: readLunchBreaks(record.lunchBreaks),
    minimumNoticeHours: readInteger(record, 'minimumNoticeHours', 0, 0, 720),
    nextDayCutoffTime,
    saturdayHours: { ...saturdayBase, enabled: saturdayEnabled },
    timezone: BOOKING_TIMEZONE,
    weekdayHours,
  }

  if (settings.saturdayHours.enabled && settings.closedWeekdays.includes(6)) {
    throw new Error('Saturday cannot be both enabled and included in closedWeekdays.')
  }
  if (!settings.closedWeekdays.includes(0)) {
    throw new Error('Sunday must remain closed because no Sunday opening hours are configured.')
  }
  if (new Set(settings.holidays).size !== settings.holidays.length) {
    throw new Error('holidays cannot contain duplicate dates.')
  }
  assertBreaksFitOpeningHours(settings)
  return settings
}

export function validateBookingSettings(value: unknown): true | string {
  try {
    resolveBookingSettings(value)
    return true
  } catch (error) {
    return error instanceof Error ? error.message : 'Booking settings are invalid.'
  }
}

export async function getBookingSettingsFromPayload(
  payload: Payload,
  req?: PayloadRequest,
): Promise<ResolvedBookingSettings> {
  const settings = await payload.findGlobal({
    slug: 'booking-settings',
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  return resolveBookingSettings(settings)
}

async function loadBookingSettings(): Promise<ResolvedBookingSettings> {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({
    slug: 'booking-settings',
    depth: 0,
    overrideAccess: false,
  })
  return resolveBookingSettings(settings)
}

export const getBookingSettings = unstable_cache(loadBookingSettings, ['booking-settings'], {
  tags: ['global_booking-settings'],
})
