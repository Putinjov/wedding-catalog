import { addCalendarDays, parseDateKey, zonedDateTimeToDate } from '@/lib/booking/date'

export type CalendarViewMode = 'month' | 'week' | 'day'

function getMonthGridStart(dateKey: string): string {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return dateKey
  const firstDay = `${parsed.year}-${parsed.month.toString().padStart(2, '0')}-01`
  return getWeekStart(firstDay)
}

export function getWeekStart(dateKey: string): string {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return dateKey
  const weekday = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay()
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1
  return addCalendarDays(dateKey, -daysSinceMonday) ?? dateKey
}

export function getVisibleDateKeys(dateKey: string, view: CalendarViewMode): string[] {
  const start = view === 'month' ? getMonthGridStart(dateKey) : view === 'week' ? getWeekStart(dateKey) : dateKey
  const length = view === 'month' ? 42 : view === 'week' ? 7 : 1
  return Array.from({ length }, (_, index) => addCalendarDays(start, index) ?? start)
}

export function getVisibleRange(dateKey: string, view: CalendarViewMode) {
  const keys = getVisibleDateKeys(dateKey, view)
  const startKey = keys[0]
  const endKey = addCalendarDays(startKey, view === 'month' ? 42 : view === 'week' ? 7 : 1) ?? startKey
  const from = zonedDateTimeToDate(startKey, '00:00')
  const to = zonedDateTimeToDate(endKey, '00:00')
  if (!from || !to) throw new Error('Invalid calendar date range.')
  return { from: from.toISOString(), to: to.toISOString(), keys }
}

export function formatCalendarDate(dateKey: string, options: Intl.DateTimeFormatOptions): string {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return dateKey
  return new Intl.DateTimeFormat('en-IE', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12)),
  )
}
