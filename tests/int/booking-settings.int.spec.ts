import { describe, expect, it } from 'vitest'

import { defaultBookingSettings, verifiedBookingVisitDetails } from '@/config/booking'
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
    expect(validateBookingSettings({ closedWeekdays: ['2', '4'] })).toBe(true)
  })

  it('keeps the existing 60-minute schedule and closed Sunday unchanged by default', () => {
    const settings = resolveBookingSettings(null)
    expect(settings.durationMinutes).toBe(60)
    expect(settings.closedWeekdays).toEqual([0, 1])
    expect(getConfiguredSlotTimes(settings, '2026-09-13')).toEqual([])
    expect(getConfiguredSlotTimes(settings, '2026-09-15')).toEqual([
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
    ])
  })

  it('uses configured standard hours for an explicitly opened Sunday and Monday', () => {
    const settings = resolveBookingSettings({
      closedWeekdays: ['2', '4'],
      durationMinutes: 90,
      weekdayHours: { start: '10:00', end: '17:00' },
    })
    for (const date of ['2026-09-13', '2026-09-14']) {
      expect(getConfiguredSlotTimes(settings, date)).toEqual(['10:00', '11:30', '13:00', '14:30'])
    }
    for (const date of ['2026-09-15', '2026-09-17']) {
      expect(getConfiguredSlotTimes(settings, date)).toEqual([])
    }
  })

  it('validates Sunday breaks using the same open-day rules as other weekdays', () => {
    const sundayBreak = { end: '13:00', start: '12:00', weekdays: ['0'] }
    expect(validateBookingSettings({ lunchBreaks: [sundayBreak] })).toMatch(/closed weekday/i)
    const settings = resolveBookingSettings({
      closedWeekdays: ['1'],
      lunchBreaks: [sundayBreak],
      weekdayHours: { start: '11:00', end: '15:00' },
    })
    expect(getConfiguredSlotTimes(settings, '2026-09-13')).toEqual(['11:00', '13:00', '14:00'])
    expect(
      validateBookingSettings({
        closedWeekdays: ['1'],
        lunchBreaks: [{ ...sundayBreak, start: '09:00' }],
      }),
    ).toMatch(/within opening hours/i)
    expect(
      validateBookingSettings({
        closedWeekdays: ['1'],
        lunchBreaks: [sundayBreak, { start: '12:30', end: '13:30', weekdays: ['0'] }],
      }),
    ).toMatch(/cannot overlap/i)
  })

  it.each([
    ['2026-03-29', '2026-03-29T09:00:00.000Z'],
    ['2026-10-25', '2026-10-25T10:00:00.000Z'],
  ])('preserves Dublin DST for an opened Sunday on %s', (date, expectedStart) => {
    const settings = resolveBookingSettings({ closedWeekdays: ['2', '4'], durationMinutes: 90 })
    const slot = getSlotDateTimes(date, '10:00', settings)
    expect(slot?.startAt.toISOString()).toBe(expectedStart)
    expect(slot && slot.endAt.getTime() - slot.startAt.getTime()).toBe(90 * 60_000)
  })

  it('accepts only verified-shape visit guidance and safe public map URLs', () => {
    const settings = resolveBookingSettings({
      visitDetails: {
        address: '  Verified address  ',
        arrivalInstructions: 'Use the marked entrance.',
        mapUrl: 'https://maps.example.test/place',
        whatToBring: [{ item: 'Your preferred shoes' }],
      },
    })

    expect(settings.visitDetails).toEqual({
      address: 'Verified address',
      arrivalInstructions: 'Use the marked entrance.',
      mapUrl: 'https://maps.example.test/place',
      whatToBring: ['Your preferred shoes'],
    })
    expect(
      validateBookingSettings({ visitDetails: { mapUrl: 'javascript:alert(1)' } }),
    ).toMatch(/public HTTPS URL/i)
    expect(
      validateBookingSettings({ visitDetails: { mapUrl: 'https://user:pass@example.test' } }),
    ).toMatch(/without credentials/i)
  })

  it('keeps the customer-facing address limited to verified business information', () => {
    expect(verifiedBookingVisitDetails).toEqual({
      address: "JOHN'S PLACE\nBIRR\nCO. OFFALY\nR42 YX50",
      arrivalInstructions: null,
      mapUrl:
        'https://www.google.com/maps/search/?api=1&query=JOHN%27S%20PLACE%2C%20BIRR%2C%20CO.%20OFFALY%2C%20R42%20YX50',
      whatToBring: [],
    })
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
