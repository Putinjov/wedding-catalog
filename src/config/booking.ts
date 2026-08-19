export const BOOKING_TIMEZONE = 'Europe/Dublin' as const
export const STRIPE_CHECKOUT_MINIMUM_HOLD_MINUTES = 30
export const MAXIMUM_BOOKING_HOLD_MINUTES = 120

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

export type BookingVisitDetails = {
  address: null | string
  arrivalInstructions: null | string
  mapUrl: null | string
  whatToBring: string[]
}

export const verifiedBookingVisitDetails: BookingVisitDetails = {
  address: "JOHN'S PLACE\nBIRR\nCO. OFFALY\nR42 YX50",
  arrivalInstructions: null,
  mapUrl:
    'https://www.google.com/maps/search/?api=1&query=JOHN%27S%20PLACE%2C%20BIRR%2C%20CO.%20OFFALY%2C%20R42%20YX50',
  whatToBring: [],
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
  visitDetails: BookingVisitDetails
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
  visitDetails: {
    address: null,
    arrivalInstructions: null,
    mapUrl: null,
    whatToBring: [],
  },
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
