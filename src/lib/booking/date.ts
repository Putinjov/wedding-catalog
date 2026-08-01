import { BOOKING_TIMEZONE, type BookingHours, type ResolvedBookingSettings } from '@/config/booking'

type CalendarDateParts = {
  day: number
  month: number
  year: number
}

const datePartsFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  timeZone: BOOKING_TIMEZONE,
  year: 'numeric',
})

const dateTimePartsFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: '2-digit',
  second: '2-digit',
  timeZone: BOOKING_TIMEZONE,
  year: 'numeric',
})

function getPartValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const value = parts.find((part) => part.type === type)?.value
  return value ? Number(value) : 0
}

function getZonedDateParts(date: Date): CalendarDateParts {
  const parts = datePartsFormatter.formatToParts(date)
  return {
    day: getPartValue(parts, 'day'),
    month: getPartValue(parts, 'month'),
    year: getPartValue(parts, 'year'),
  }
}

function getZonedDateTimeParts(date: Date) {
  const parts = dateTimePartsFormatter.formatToParts(date)
  return {
    day: getPartValue(parts, 'day'),
    hour: getPartValue(parts, 'hour'),
    minute: getPartValue(parts, 'minute'),
    month: getPartValue(parts, 'month'),
    second: getPartValue(parts, 'second'),
    year: getPartValue(parts, 'year'),
  }
}

export function parseDateKey(value: string): CalendarDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return { day, month, year }
}

export function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour <= 23 && minute <= 59 ? { hour, minute } : null
}

function toMinutes(value: string): number | null {
  const parsed = parseTime(value)
  return parsed ? parsed.hour * 60 + parsed.minute : null
}

export function getDateKey(date: Date = new Date()): string {
  const { day, month, year } = getZonedDateParts(date)
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`
}

function getUtcDateKey(date: Date): string {
  return `${date.getUTCFullYear().toString().padStart(4, '0')}-${(date.getUTCMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`
}

export function addCalendarDays(dateKey: string, days: number): string | null {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return null
  return getUtcDateKey(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days)))
}

export function getBookingDateBounds(
  settings: ResolvedBookingSettings,
  now: Date = new Date(),
): { maxDate: string; minDate: string } {
  const today = getDateKey(now)
  return {
    maxDate: addCalendarDays(today, settings.bookingWindowDays) ?? today,
    minDate: addCalendarDays(today, 1) ?? today,
  }
}

function getWeekday(dateKey: string): number | null {
  const parsed = parseDateKey(dateKey)
  return parsed
    ? new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay()
    : null
}

function isExceptionalClosure(dateKey: string, settings: ResolvedBookingSettings): boolean {
  return (
    settings.holidays.includes(dateKey) ||
    settings.closures.some(({ endDate, startDate }) => dateKey >= startDate && dateKey <= endDate)
  )
}

export function getOpeningHours(
  dateKey: string,
  settings: ResolvedBookingSettings,
): BookingHours | null {
  const weekday = getWeekday(dateKey)
  if (
    weekday == null ||
    settings.closedWeekdays.includes(weekday) ||
    isExceptionalClosure(dateKey, settings)
  ) {
    return null
  }
  if (weekday === 6) return settings.saturdayHours.enabled ? settings.saturdayHours : null
  return settings.weekdayHours
}

export function isClosedDate(dateKey: string, settings: ResolvedBookingSettings): boolean {
  return getOpeningHours(dateKey, settings) === null
}

function formatWeekdayList(days: number[]): string {
  const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const names = days.map((day) => labels[day])
  if (names.length < 2) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function getBookingWindowLabel(settings: ResolvedBookingSettings): string {
  return `Choose a date within the next ${settings.bookingWindowDays} days, excluding today.`
}

export function getBookingScheduleLabel(settings: ResolvedBookingSettings): string {
  const openWeekdays = [0, 1, 2, 3, 4, 5, 6].filter(
    (weekday) =>
      !settings.closedWeekdays.includes(weekday) &&
      (weekday !== 6 || settings.saturdayHours.enabled),
  )
  return `Fittings are available ${formatWeekdayList(openWeekdays)} during the configured opening hours.`
}

export function isDateWithinBookingWindow(
  dateKey: string,
  settings: ResolvedBookingSettings,
  now: Date = new Date(),
): boolean {
  const { maxDate, minDate } = getBookingDateBounds(settings, now)
  return Boolean(parseDateKey(dateKey)) && dateKey >= minDate && dateKey <= maxDate
}

function rangesOverlap(start: number, end: number, otherStart: number, otherEnd: number): boolean {
  return start < otherEnd && end > otherStart
}

function isUnavailableInterval(
  dateKey: string,
  startMinutes: number,
  endMinutes: number,
  settings: ResolvedBookingSettings,
): boolean {
  const weekday = getWeekday(dateKey)
  if (weekday == null) return true
  const bufferedStart = startMinutes - settings.bufferBeforeMinutes
  const bufferedEnd = endMinutes + settings.bufferAfterMinutes

  const hitsLunch = settings.lunchBreaks.some((lunchBreak) => {
    const lunchStart = toMinutes(lunchBreak.start)
    const lunchEnd = toMinutes(lunchBreak.end)
    return (
      lunchBreak.weekdays.includes(weekday) &&
      lunchStart != null &&
      lunchEnd != null &&
      rangesOverlap(bufferedStart, bufferedEnd, lunchStart, lunchEnd)
    )
  })
  if (hitsLunch) return true

  return settings.blockedIntervals.some((blocked) => {
    const blockedStart = toMinutes(blocked.start)
    const blockedEnd = toMinutes(blocked.end)
    return (
      blocked.date === dateKey &&
      blockedStart != null &&
      blockedEnd != null &&
      rangesOverlap(bufferedStart, bufferedEnd, blockedStart, blockedEnd)
    )
  })
}

export function isValidSlotTime(
  dateKey: string,
  time: string,
  settings: ResolvedBookingSettings,
): boolean {
  const requestedMinutes = toMinutes(time)
  const hours = getOpeningHours(dateKey, settings)
  const openingMinutes = hours ? toMinutes(hours.start) : null
  const closingMinutes = hours ? toMinutes(hours.end) : null
  if (
    requestedMinutes == null ||
    openingMinutes == null ||
    closingMinutes == null ||
    requestedMinutes < openingMinutes ||
    requestedMinutes + settings.durationMinutes > closingMinutes ||
    (requestedMinutes - openingMinutes) % settings.durationMinutes !== 0
  ) {
    return false
  }
  return !isUnavailableInterval(
    dateKey,
    requestedMinutes,
    requestedMinutes + settings.durationMinutes,
    settings,
  )
}

function slotTimesForHours(hours: BookingHours, settings: ResolvedBookingSettings): string[] {
  const start = toMinutes(hours.start)
  const end = toMinutes(hours.end)
  if (start == null || end == null) return []

  const times: string[] = []
  for (let minutes = start; minutes + settings.durationMinutes <= end; minutes += settings.durationMinutes) {
    times.push(`${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60)
      .toString()
      .padStart(2, '0')}`)
  }
  return times
}

export function getConfiguredSlotTimes(
  settings: ResolvedBookingSettings,
  dateKey?: string,
): string[] {
  if (dateKey) {
    const hours = getOpeningHours(dateKey, settings)
    return hours
      ? slotTimesForHours(hours, settings).filter((time) => isValidSlotTime(dateKey, time, settings))
      : []
  }

  const times = new Set(slotTimesForHours(settings.weekdayHours, settings))
  if (settings.saturdayHours.enabled) {
    for (const time of slotTimesForHours(settings.saturdayHours, settings)) times.add(time)
  }
  return [...times].sort()
}

function getTimezoneOffsetMilliseconds(date: Date): number {
  const parts = getZonedDateTimeParts(date)
  return (
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
    date.getTime()
  )
}

export function zonedDateTimeToDate(dateKey: string, time: string): Date | null {
  const parsedDate = parseDateKey(dateKey)
  const parsedTime = parseTime(time)
  if (!parsedDate || !parsedTime) return null

  const localAsUtc = Date.UTC(
    parsedDate.year,
    parsedDate.month - 1,
    parsedDate.day,
    parsedTime.hour,
    parsedTime.minute,
  )
  const firstGuess = new Date(localAsUtc)
  const firstOffset = getTimezoneOffsetMilliseconds(firstGuess)
  const candidate = new Date(localAsUtc - firstOffset)
  const finalOffset = getTimezoneOffsetMilliseconds(candidate)
  return new Date(localAsUtc - finalOffset)
}

export function getSlotDateTimes(
  dateKey: string,
  time: string,
  settings: ResolvedBookingSettings,
): { endAt: Date; startAt: Date } | null {
  const startAt = zonedDateTimeToDate(dateKey, time)
  if (!startAt) return null
  return {
    endAt: new Date(startAt.getTime() + settings.durationMinutes * 60 * 1000),
    startAt,
  }
}

export function formatDateForCustomer(dateKey: string): string {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return dateKey
  return new Intl.DateTimeFormat('en-IE', { dateStyle: 'full', timeZone: 'UTC' }).format(
    new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12)),
  )
}

export function formatDateTimeForCustomer(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: BOOKING_TIMEZONE,
  }).format(date)
}

export function formatTimeForCustomer(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IE', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: BOOKING_TIMEZONE,
  }).format(date)
}

export function formatTimeInputValue(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone: BOOKING_TIMEZONE,
  }).format(date)
}
