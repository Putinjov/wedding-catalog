import type { DressMode } from '@/lib/catalogue'

export const bookingConfig = {
  timezone: 'Europe/Dublin',
  durationMinutes: 60,
  bookingWindowDays: 60,
  closedWeekdays: [0, 1],
  workingHours: {
    start: '10:00',
    end: '17:00',
  },
} as const

export type BookingPurpose = DressMode

export type AvailableSlot = {
  startAt: string
  endAt: string
  label: string
}
