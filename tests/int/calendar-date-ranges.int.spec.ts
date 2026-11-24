import { describe, expect, it } from 'vitest'
import { parseCalendarRange } from '@/lib/admin/appointments/getCalendarAppointments'

describe('calendar date ranges', () => {
  it('treats date-only boundaries as Europe/Dublin midnights during summer time', () => {
    const range = parseCalendarRange('2026-09-12', '2026-09-13')
    expect(range.from.toISOString()).toBe('2026-09-11T23:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-09-12T23:00:00.000Z')
  })

  it('treats date-only boundaries as Europe/Dublin midnights during winter time', () => {
    const range = parseCalendarRange('2026-12-12', '2026-12-13')
    expect(range.from.toISOString()).toBe('2026-12-12T00:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-12-13T00:00:00.000Z')
  })
})
