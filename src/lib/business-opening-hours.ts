import type { BookingHours, ResolvedBookingSettings } from '@/config/booking'

const weekdays = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
] as const

type BusinessOpeningDay = {
  dayOfWeek: `https://schema.org/${(typeof weekdays)[number]['label']}`
  label: (typeof weekdays)[number]['label']
  periods: BookingHours[]
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function getOpeningPeriods(
  weekday: number,
  hours: BookingHours,
  settings: ResolvedBookingSettings,
): BookingHours[] {
  const breaks = settings.lunchBreaks
    .filter((lunchBreak) => lunchBreak.weekdays.includes(weekday))
    .sort((left, right) => toMinutes(left.start) - toMinutes(right.start))
  const periods: BookingHours[] = []
  let start = hours.start

  for (const lunchBreak of breaks) {
    if (toMinutes(start) < toMinutes(lunchBreak.start)) {
      periods.push({ end: lunchBreak.start, start })
    }
    start = lunchBreak.end
  }

  if (toMinutes(start) < toMinutes(hours.end)) periods.push({ end: hours.end, start })
  return periods
}

export function getBusinessOpeningDays(settings: ResolvedBookingSettings): BusinessOpeningDay[] {
  return weekdays.flatMap(({ label, value }) => {
    if (
      settings.closedWeekdays.includes(value) ||
      (value === 6 && !settings.saturdayHours.enabled)
    ) {
      return []
    }

    const hours = value === 6 ? settings.saturdayHours : settings.weekdayHours
    return [
      {
        dayOfWeek: `https://schema.org/${label}` as const,
        label,
        periods: getOpeningPeriods(value, hours, settings),
      },
    ]
  })
}
