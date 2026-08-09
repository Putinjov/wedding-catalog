import { describe, expect, it } from 'vitest'

import { defaultBookingSettings, type ResolvedBookingSettings } from '@/config/booking'
import { zonedDateTimeToDate } from '@/lib/booking/date'
import {
  getBookingNoticeViolation,
  getNoticeEligibleSlotTimes,
} from '@/lib/booking/noticeRules'

function settings(
  overrides: Partial<ResolvedBookingSettings>,
): ResolvedBookingSettings {
  return { ...defaultBookingSettings, ...overrides }
}

describe('booking minimum notice and next-day cutoff', () => {
  it('allows the exact elapsed-hours boundary across the spring DST change', () => {
    const startAt = zonedDateTimeToDate('2026-03-29', '11:00')
    const configured = settings({ minimumNoticeHours: 24 })

    expect(startAt?.toISOString()).toBe('2026-03-29T10:00:00.000Z')
    expect(
      startAt &&
        getBookingNoticeViolation({
          dateKey: '2026-03-29',
          now: new Date('2026-03-28T10:00:00.000Z'),
          settings: configured,
          startAt,
        }),
    ).toBeNull()
    expect(
      startAt &&
        getBookingNoticeViolation({
          dateKey: '2026-03-29',
          now: new Date('2026-03-28T10:00:00.001Z'),
          settings: configured,
          startAt,
        }),
    ).toBe('minimum-notice')
  })

  it('uses elapsed hours across the autumn DST change', () => {
    const startAt = zonedDateTimeToDate('2026-10-25', '09:00')
    const configured = settings({ minimumNoticeHours: 24 })

    expect(startAt?.toISOString()).toBe('2026-10-25T09:00:00.000Z')
    expect(
      startAt &&
        getBookingNoticeViolation({
          dateKey: '2026-10-25',
          now: new Date('2026-10-24T09:00:00.000Z'),
          settings: configured,
          startAt,
        }),
    ).toBeNull()
  })

  it('closes next-day booking at the exact Dublin cutoff in winter and summer', () => {
    const configured = settings({ nextDayCutoffTime: '17:00' })
    const winterSlot = new Date('2026-03-28T10:00:00.000Z')
    const summerSlot = new Date('2026-07-21T09:00:00.000Z')

    expect(
      getBookingNoticeViolation({
        dateKey: '2026-03-28',
        now: new Date('2026-03-27T16:59:59.000Z'),
        settings: configured,
        startAt: winterSlot,
      }),
    ).toBeNull()
    expect(
      getBookingNoticeViolation({
        dateKey: '2026-03-28',
        now: new Date('2026-03-27T17:00:00.000Z'),
        settings: configured,
        startAt: winterSlot,
      }),
    ).toBe('next-day-cutoff')
    expect(
      getBookingNoticeViolation({
        dateKey: '2026-07-21',
        now: new Date('2026-07-20T15:59:59.000Z'),
        settings: configured,
        startAt: summerSlot,
      }),
    ).toBeNull()
    expect(
      getBookingNoticeViolation({
        dateKey: '2026-07-21',
        now: new Date('2026-07-20T16:00:00.000Z'),
        settings: configured,
        startAt: summerSlot,
      }),
    ).toBe('next-day-cutoff')
  })

  it('lets an admin expose notice-restricted slots without exposing blocked intervals', () => {
    const configured = settings({
      blockedIntervals: [{ date: '2026-07-21', end: '11:00', start: '10:00' }],
      nextDayCutoffTime: '17:00',
    })
    const now = new Date('2026-07-20T16:00:00.000Z')

    expect(
      getNoticeEligibleSlotTimes({ dateKey: '2026-07-21', now, settings: configured }),
    ).toEqual([])
    expect(
      getNoticeEligibleSlotTimes({
        allowNoticeOverride: true,
        dateKey: '2026-07-21',
        now,
        settings: configured,
      }),
    ).toEqual(['11:00', '12:00', '13:00', '14:00', '15:00', '16:00'])
  })
})
