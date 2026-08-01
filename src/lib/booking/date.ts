import { bookingConfig } from '@/config/booking'

type CalendarDateParts = {
  day: number
  month: number
  year: number
}

const datePartsFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  timeZone: bookingConfig.timezone,
  year: 'numeric',
})

const dateTimePartsFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: '2-digit',
  second: '2-digit',
  timeZone: bookingConfig.timezone,
  year: 'numeric',
})

function getPartValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
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
  if (!match) {
    return null
  }

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
  if (!parsed) {
    return null
  }

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days))
  return getUtcDateKey(date)
}

export function getBookingDateBounds(now: Date = new Date()): {
  maxDate: string
  minDate: string
} {
  const today = getDateKey(now)
  return {
    maxDate: addCalendarDays(today, bookingConfig.bookingWindowDays) ?? today,
    minDate: addCalendarDays(today, 1) ?? today,
  }
}

function formatWeekdayList(days: number[]): string {
  const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const names = days.map((day) => labels[day])
  if (names.length < 2) {
    return names[0] ?? ''
  }

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function getBookingWindowLabel(): string {
  return `Choose a date within the next ${bookingConfig.bookingWindowDays} days, excluding today.`
}

export function getBookingScheduleLabel(): string {
  const openWeekdays = [0, 1, 2, 3, 4, 5, 6].filter(
    (weekday) => !bookingConfig.closedWeekdays.some((closedDay) => closedDay === weekday),
  )
  const slotTimes = getConfiguredSlotTimes()
  const lastStartTime = slotTimes[slotTimes.length - 1] ?? bookingConfig.workingHours.start
  return `Fittings are available ${formatWeekdayList(openWeekdays)}, from ${bookingConfig.workingHours.start} to ${lastStartTime}.`
}

export function isDateWithinBookingWindow(dateKey: string, now: Date = new Date()): boolean {
  const { maxDate, minDate } = getBookingDateBounds(now)
  return Boolean(parseDateKey(dateKey)) && dateKey >= minDate && dateKey <= maxDate
}

export function isClosedDate(dateKey: string): boolean {
  const parsed = parseDateKey(dateKey)
  if (!parsed) {
    return true
  }

  const weekday = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay()
  return bookingConfig.closedWeekdays.some((closedDay) => closedDay === weekday)
}

function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour <= 23 && minute <= 59 ? { hour, minute } : null
}

export function isValidSlotTime(dateKey: string, time: string): boolean {
  if (!parseDateKey(dateKey) || isClosedDate(dateKey)) {
    return false
  }

  const parsedTime = parseTime(time)
  const workingStart = parseTime(bookingConfig.workingHours.start)
  const workingEnd = parseTime(bookingConfig.workingHours.end)
  if (!parsedTime || !workingStart || !workingEnd) {
    return false
  }

  const requestedMinutes = parsedTime.hour * 60 + parsedTime.minute
  const startMinutes = workingStart.hour * 60 + workingStart.minute
  const endMinutes = workingEnd.hour * 60 + workingEnd.minute

  return (
    requestedMinutes >= startMinutes &&
    requestedMinutes + bookingConfig.durationMinutes <= endMinutes &&
    (requestedMinutes - startMinutes) % bookingConfig.durationMinutes === 0
  )
}

export function getConfiguredSlotTimes(): string[] {
  const start = parseTime(bookingConfig.workingHours.start)
  const end = parseTime(bookingConfig.workingHours.end)
  if (!start || !end) {
    return []
  }

  const times: string[] = []
  const startMinutes = start.hour * 60 + start.minute
  const endMinutes = end.hour * 60 + end.minute
  for (
    let minutes = startMinutes;
    minutes + bookingConfig.durationMinutes <= endMinutes;
    minutes += bookingConfig.durationMinutes
  ) {
    times.push(`${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60)
      .toString()
      .padStart(2, '0')}`)
  }

  return times
}

function getTimezoneOffsetMilliseconds(date: Date): number {
  const parts = getZonedDateTimeParts(date)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return asUtc - date.getTime()
}

export function zonedDateTimeToDate(dateKey: string, time: string): Date | null {
  const parsedDate = parseDateKey(dateKey)
  const parsedTime = parseTime(time)
  if (!parsedDate || !parsedTime) {
    return null
  }

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

export function getSlotDateTimes(dateKey: string, time: string): {
  endAt: Date
  startAt: Date
} | null {
  const startAt = zonedDateTimeToDate(dateKey, time)
  if (!startAt) {
    return null
  }

  return {
    endAt: new Date(startAt.getTime() + bookingConfig.durationMinutes * 60 * 1000),
    startAt,
  }
}

export function formatDateForCustomer(dateKey: string): string {
  const parsed = parseDateKey(dateKey)
  if (!parsed) {
    return dateKey
  }

  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12)))
}

export function formatDateTimeForCustomer(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: bookingConfig.timezone,
  }).format(date)
}

export function formatTimeForCustomer(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-IE', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: bookingConfig.timezone,
  }).format(date)
}

export function formatTimeInputValue(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone: bookingConfig.timezone,
  }).format(date)
}
