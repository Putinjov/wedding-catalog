const timezone = 'Europe/Dublin'

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: timezone,
  year: 'numeric',
})

export function getDateKey(date = new Date()): string {
  const parts = dateKeyFormatter.formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function addDays(dateKey: string, days: number): string {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days, 12))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`
}

export function dateKeyToPickerDate(dateKey: string): Date {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function pickerDateToKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export function formatDayHeading(dateKey: string): string {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-IE', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    weekday: 'long',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

export function formatDayShort(dateKey: string): { day: string; number: string } {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return {
    day: new Intl.DateTimeFormat('en-IE', { timeZone: 'UTC', weekday: 'short' }).format(date),
    number: String(day),
  }
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value))
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value))
}

export function formatMoney(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-IE', { currency, style: 'currency' }).format(amount)
}

export function isPast(value: string): boolean {
  return new Date(value).getTime() <= Date.now()
}
