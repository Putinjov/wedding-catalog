export const BOOKING_TIMEZONE = 'Europe/Dublin' as const

export const bookingPurposeValues = ['buy', 'rent', 'undecided'] as const

export type BookingHours = {
  end: string
  start: string
}

export type BookingLunchBreak = BookingHours & {
  weekdays: number[]
}

export type BookingDateRange = {
  endDate: string
  startDate: string
}

export type BookingBlockedInterval = BookingHours & {
  date: string
}

export type ResolvedBookingSettings = {
  blockedIntervals: BookingBlockedInterval[]
  bookingWindowDays: number
  bufferAfterMinutes: number
  bufferBeforeMinutes: number
  closedWeekdays: number[]
  closures: BookingDateRange[]
  durationMinutes: number
  holdMinutes: number
  holidays: string[]
  lunchBreaks: BookingLunchBreak[]
  minimumNoticeHours: number
  nextDayCutoffTime: null | string
  saturdayHours: BookingHours & { enabled: boolean }
  timezone: typeof BOOKING_TIMEZONE
  weekdayHours: BookingHours
}

export const defaultBookingSettings: ResolvedBookingSettings = {
  blockedIntervals: [],
  bookingWindowDays: 60,
  bufferAfterMinutes: 0,
  bufferBeforeMinutes: 0,
  closedWeekdays: [0, 1],
  closures: [],
  durationMinutes: 60,
  holdMinutes: 30,
  holidays: [],
  lunchBreaks: [],
  minimumNoticeHours: 0,
  nextDayCutoffTime: null,
  saturdayHours: {
    enabled: true,
    end: '17:00',
    start: '10:00',
  },
  timezone: BOOKING_TIMEZONE,
  weekdayHours: {
    end: '17:00',
    start: '10:00',
  },
}

export type BookingPurpose = (typeof bookingPurposeValues)[number]

export type AvailableSlot = {
  startAt: string
  endAt: string
  label: string
}
