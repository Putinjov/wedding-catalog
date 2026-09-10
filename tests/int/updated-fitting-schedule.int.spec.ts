import { describe, expect, it, vi } from 'vitest'

import { defaultBookingSettings } from '@/config/booking'
import { appointmentOverlapsSlot } from '@/lib/booking/appointmentConflicts'
import { getConfiguredSlotTimes, getSlotDateTimes, isClosedDate } from '@/lib/booking/date'
import { resolveBookingSettings } from '@/lib/booking/settings'
import { getBusinessOpeningDays } from '@/lib/business-opening-hours'
import {
  classifyFittingSchedule,
  down,
  up,
  updatedFittingSchedule,
} from '@/migrations/20260909_213000_update_fitting_schedule'

function fixture(value: unknown = defaultBookingSettings) {
  const req = { context: {} }
  const findGlobal = vi
    .fn()
    .mockResolvedValue(
      typeof value === 'object' && value !== null ? { id: 'settings-fixture', ...value } : value,
    )
  const updateGlobal = vi.fn().mockResolvedValue(value)
  const args = {
    payload: { findGlobal, updateGlobal, logger: { info: vi.fn() } },
    req,
  } as unknown as Parameters<typeof up>[0]
  return { args, findGlobal, req, updateGlobal }
}

describe('updated fitting schedule', () => {
  const settings = resolveBookingSettings({ ...defaultBookingSettings, ...updatedFittingSchedule })

  it('offers four complete 90-minute slots on Sunday and Monday, closing Tuesday and Thursday', () => {
    for (const day of ['2026-09-13', '2026-09-14', '2026-09-16', '2026-09-18', '2026-09-19']) {
      expect(getConfiguredSlotTimes(settings, day)).toEqual(['10:00', '11:30', '13:00', '14:30'])
    }
    for (const day of ['2026-09-15', '2026-09-17']) {
      expect(isClosedDate(day, settings)).toBe(true)
      expect(getConfiguredSlotTimes(settings, day)).toEqual([])
    }
    expect(getBusinessOpeningDays(settings).map(({ label }) => label)).toEqual([
      'Sunday',
      'Monday',
      'Wednesday',
      'Friday',
      'Saturday',
    ])
  })

  it.each([
    ['2026-03-29', '2026-03-29T09:00:00.000Z'],
    ['2026-10-25', '2026-10-25T10:00:00.000Z'],
  ])('preserves Dublin DST and a 90-minute interval on %s', (date, start) => {
    const slot = getSlotDateTimes(date, '10:00', settings)
    expect(slot?.startAt.toISOString()).toBe(start)
    expect(slot && slot.endAt.getTime() - slot.startAt.getTime()).toBe(90 * 60_000)
  })

  it('respects existing 60-minute appointments without modifying their stored interval', () => {
    const existing = { startAt: '2026-09-14T10:00:00.000Z', endAt: '2026-09-14T11:00:00.000Z' }
    const snapshot = { ...existing }
    const slot = getSlotDateTimes('2026-09-14', '11:30', settings)!
    expect(appointmentOverlapsSlot(existing, slot.startAt, slot.endAt)).toBe(true)
    expect(existing).toEqual(snapshot)
  })

  it('allows Sunday lunch breaks and still respects exceptional closures', () => {
    const withBreak = resolveBookingSettings({
      ...settings,
      holidays: ['2026-09-14'],
      lunchBreaks: [{ start: '13:00', end: '14:30', weekdays: ['0'] }],
    })
    expect(getConfiguredSlotTimes(withBreak, '2026-09-13')).toEqual(['10:00', '11:30', '14:30'])
    expect(getConfiguredSlotTimes(withBreak, '2026-09-14')).toEqual([])
  })

  it('updates only the agreed global fields through the transaction request', async () => {
    const test = fixture()
    await up(test.args)
    expect(test.findGlobal).toHaveBeenCalledWith(expect.objectContaining({ req: test.req }))
    expect(test.updateGlobal).toHaveBeenCalledExactlyOnceWith({
      slug: 'booking-settings',
      data: updatedFittingSchedule,
      context: { disableRevalidate: true },
      overrideAccess: true,
      req: test.req,
    })
  })

  it('is idempotent and preserves other settings', async () => {
    const test = fixture({ ...settings, minimumNoticeHours: 24 })
    await up(test.args)
    expect(test.updateGlobal).not.toHaveBeenCalled()
  })

  it('fails closed for unexpected hours, duration, weekdays or conflicting breaks', async () => {
    expect(() => classifyFittingSchedule({ ...settings, durationMinutes: 120 })).toThrow(
      /manual review/,
    )
    expect(() => classifyFittingSchedule({ ...settings, closedWeekdays: [2] })).toThrow(
      /manual review/,
    )
    expect(() =>
      classifyFittingSchedule({ ...settings, weekdayHours: { start: '09:00', end: '17:00' } }),
    ).toThrow(/opening hours/)
    const test = fixture({
      ...defaultBookingSettings,
      lunchBreaks: [{ start: '12:00', end: '13:00', weekdays: [2] }],
    })
    await expect(up(test.args)).rejects.toThrow(/closed weekday/)
    expect(test.updateGlobal).not.toHaveBeenCalled()
  })

  it('requires a separate business decision before rollback', async () => {
    const test = fixture(settings)
    await expect(down(test.args)).rejects.toThrow(/Automatic schedule rollback is disabled/)
    expect(test.updateGlobal).not.toHaveBeenCalled()
  })

  it('refuses to reinterpret missing schedule fields using fallback defaults', () => {
    for (const value of [
      null,
      {},
      [],
      { durationMinutes: 60, closedWeekdays: [0, 1], weekdayHours: {} },
    ]) {
      expect(() => classifyFittingSchedule(value)).toThrow(/incomplete settings/)
    }
  })

  it('requires an existing persisted global before making any changes', async () => {
    const test = fixture({ ...defaultBookingSettings, id: undefined })
    await expect(up(test.args)).rejects.toThrow(/persisted booking settings are missing/)
    expect(test.updateGlobal).not.toHaveBeenCalled()
  })
})
