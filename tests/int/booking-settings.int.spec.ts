import { describe, expect, it } from 'vitest'

import { defaultBookingSettings } from '@/config/booking'
import { appointmentOverlapsSlot } from '@/lib/booking/appointmentConflicts'
import {
  getConfiguredSlotTimes,
  getSlotDateTimes,
  isClosedDate,
  isValidSlotTime,
} from '@/lib/booking/date'
import { resolveBookingSettings, validateBookingSettings } from '@/lib/booking/settings'
import { settingsMatchDefaults } from '@/migrations/20260801_210000_create_booking_settings'
import { assertStripeCompatibleBookingHold } from '@/migrations/20260809_220000_enforce_stripe_hold_minimum'

describe('booking settings', () => {
  it('resolves safe defaults when the global has not been seeded yet', () => {
    expect(resolveBookingSettings(null)).toEqual(defaultBookingSettings)
  })

  it('only permits rollback while the seeded values remain unchanged', () => {
    expect(
      settingsMatchDefaults({
        ...defaultBookingSettings,
        closedWeekdays: ['0', '1'],
        holidays: [],
      }),
    ).toBe(true)
    expect(
      settingsMatchDefaults({
        ...defaultBookingSettings,
        bookingWindowDays: 90,
        closedWeekdays: ['0', '1'],
      }),
    ).toBe(false)
  })

  it('rejects invalid timezone and contradictory schedules', () => {
    expect(validateBookingSettings({ timezone: 'UTC' })).toMatch(/Europe\/Dublin/)
    expect(
      validateBookingSettings({
        closedWeekdays: ['0', '6'],
        saturdayHours: { enabled: true, end: '17:00', start: '10:00' },
      }),
    ).toMatch(/Saturday cannot be both enabled/i)
    expect(validateBookingSettings({ closedWeekdays: ['1'] })).toMatch(/Sunday must remain closed/i)
  })

  it('rejects holds shorter than Stripe Checkout supports without rewriting them', () => {
    expect(validateBookingSettings({ holdMinutes: 29 })).toMatch(/30 to 120/)
    expect(() => assertStripeCompatibleBookingHold({ holdMinutes: 29 })).toThrow(
      /Task 21 migration aborted.*at least 30/i,
    )
    expect(() => assertStripeCompatibleBookingHold({ holdMinutes: 30 })).not.toThrow()
  })

  it('rejects lunch breaks outside opening hours or on closed days', () => {
    expect(
      validateBookingSettings({
        lunchBreaks: [{ end: '13:00', start: '12:00', weekdays: ['1'] }],
      }),
    ).toMatch(/closed weekday/i)
    expect(
      validateBookingSettings({
        lunchBreaks: [{ end: '18:00', start: '16:00', weekdays: ['2'] }],
      }),
    ).toMatch(/within opening hours/i)
  })

  it('applies holidays, closures, lunch breaks, blocked intervals, and buffers', () => {
    const settings = resolveBookingSettings({
      blockedIntervals: [{ date: '2026-07-22', end: '13:00', start: '12:00' }],
      bufferAfterMinutes: 30,
      bufferBeforeMinutes: 30,
      closures: [{ endDate: '2026-08-12', startDate: '2026-08-10' }],
      holidays: [{ date: '2026-08-03' }],
      lunchBreaks: [{ end: '15:00', start: '14:00', weekdays: ['3'] }],
    })

    expect(isClosedDate('2026-08-03', settings)).toBe(true)
    expect(isClosedDate('2026-08-11', settings)).toBe(true)
    expect(isValidSlotTime('2026-07-22', '11:00', settings)).toBe(false)
    expect(isValidSlotTime('2026-07-22', '13:00', settings)).toBe(false)
    expect(isValidSlotTime('2026-07-22', '14:00', settings)).toBe(false)
    expect(getConfiguredSlotTimes(settings, '2026-07-22')).toEqual(['10:00', '16:00'])
  })

  it('preserves Europe/Dublin offsets across DST boundaries', () => {
    expect(getSlotDateTimes('2026-03-28', '10:00', defaultBookingSettings)?.startAt.toISOString()).toBe(
      '2026-03-28T10:00:00.000Z',
    )
    expect(getSlotDateTimes('2026-03-31', '10:00', defaultBookingSettings)?.startAt.toISOString()).toBe(
      '2026-03-31T09:00:00.000Z',
    )
    expect(getSlotDateTimes('2026-10-24', '10:00', defaultBookingSettings)?.startAt.toISOString()).toBe(
      '2026-10-24T09:00:00.000Z',
    )
    expect(getSlotDateTimes('2026-10-27', '10:00', defaultBookingSettings)?.startAt.toISOString()).toBe(
      '2026-10-27T10:00:00.000Z',
    )
  })

  it('uses the configured total buffer when comparing existing appointments', () => {
    const existing = {
      endAt: '2026-07-22T11:00:00.000Z',
      startAt: '2026-07-22T10:00:00.000Z',
    }
    const nextStart = new Date('2026-07-22T11:30:00.000Z')
    const nextEnd = new Date('2026-07-22T12:30:00.000Z')

    expect(appointmentOverlapsSlot(existing, nextStart, nextEnd)).toBe(false)
    expect(appointmentOverlapsSlot(existing, nextStart, nextEnd, 60)).toBe(true)
  })
})
