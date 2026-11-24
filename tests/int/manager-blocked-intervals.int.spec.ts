import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { defaultBookingSettings } from '@/config/booking'
import { isValidSlotTime } from '@/lib/booking/date'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
import { changeBlockedIntervals, changeBlockedIntervalsEndpoint } from '@/BookingSettings/blockedIntervals'

const date = '2026-12-01'
const interval = (start: string, end: string) => ({ date, start, end })

describe('Manager blocked intervals', () => {
  it('merges adjacent and overlapping blocks without mutating inputs', () => {
    const existing = [interval('10:00', '11:00'), interval('12:00', '13:00')]
    const result = changeBlockedIntervals(existing, interval('11:00', '12:00'), true)
    expect(result).toEqual([interval('10:00', '13:00')])
    expect(existing[0].end).toBe('11:00')
    expect(changeBlockedIntervals(result, interval('11:00', '12:00'), true)).toEqual(result)
  })
  it('reopens part of a block without affecting other dates', () => {
    const other = { ...interval('10:00', '13:00'), date: '2026-12-02' }
    expect(changeBlockedIntervals([other, interval('10:00', '13:00')], interval('11:00', '12:00'), false))
      .toEqual([other, interval('10:00', '11:00'), interval('12:00', '13:00')])
  })
  it('affects the authoritative slot validation and restores eligibility on unblock', () => {
    const settings = { ...defaultBookingSettings, closedWeekdays: [], weekdayHours: { start: '10:00', end: '17:00' }, durationMinutes: 60, lunchBreaks: [], bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }
    const blockedIntervals = changeBlockedIntervals([], interval('11:00', '12:00'), true)
    expect(isValidSlotTime(date, '11:00', { ...settings, blockedIntervals })).toBe(false)
    expect(isValidSlotTime(date, '10:00', { ...settings, blockedIntervals })).toBe(true)
    expect(isValidSlotTime(date, '11:00', { ...settings, blockedIntervals: changeBlockedIntervals(blockedIntervals, interval('11:00', '12:00'), false) })).toBe(true)
  })
  it.each([[null, 401], [{ id: 'staff', role: 'staff' }, 403]])('rejects unauthorized changes', async (user, status) => {
    expect((await changeBlockedIntervalsEndpoint.handler({ user } as PayloadRequest)).status).toBe(status)
  })
  it('rejects reversed times', async () => {
    const response = await changeBlockedIntervalsEndpoint.handler({
      user: { id: 'manager', role: 'manager' },
      json: async () => ({ ...interval('13:00', '12:00'), closed: true }),
    } as PayloadRequest)
    expect(response.status).toBe(400)
  })
})
