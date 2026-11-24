import { describe, expect, it } from 'vitest'
import { defaultBookingSettings } from '@/config/booking'
import { getConfiguredSlotTimes, getOpeningHours, isValidSlotTime } from '@/lib/booking/date'
import { resolveBookingSettings } from '@/lib/booking/settings'

const sunday = '2027-01-03'
const override = { date: sunday, start: '12:00', end: '15:00' }

describe('date-specific opening hours', () => {
  it('opens a regular day off without changing other dates', () => {
    const settings = { ...defaultBookingSettings, dateHours: [override] }
    expect(getConfiguredSlotTimes(settings, sunday)).toEqual(['12:00', '13:00', '14:00'])
    expect(getOpeningHours('2027-01-10', settings)).toBeNull()
  })
  it('keeps explicit closures authoritative', () => {
    const settings = { ...defaultBookingSettings, dateHours: [override], holidays: [sunday] }
    expect(getOpeningHours(sunday, settings)).toBeNull()
  })
  it('respects blocked intervals and fitting duration', () => {
    const settings = { ...defaultBookingSettings, dateHours: [override], blockedIntervals: [{ date: sunday, start: '13:00', end: '14:00' }] }
    expect(getConfiguredSlotTimes(settings, sunday)).toEqual(['12:00', '14:00'])
    expect(isValidSlotTime(sunday, '15:00', settings)).toBe(false)
  })
  it('extends or shortens a normal working day', () => {
    const date = '2027-01-05'
    expect(getConfiguredSlotTimes({ ...defaultBookingSettings, dateHours: [{ date, start: '09:00', end: '18:00' }] }, date)).toHaveLength(9)
    expect(getConfiguredSlotTimes({ ...defaultBookingSettings, dateHours: [{ date, start: '12:00', end: '14:00' }] }, date)).toEqual(['12:00', '13:00'])
  })
  it('rejects duplicate dates and intervals shorter than a fitting', () => {
    expect(() => resolveBookingSettings({ dateHours: [override, override] })).toThrow(/duplicate/)
    expect(() => resolveBookingSettings({ dateHours: [{ ...override, end: '12:30' }] })).toThrow(/complete fitting/)
  })
})
