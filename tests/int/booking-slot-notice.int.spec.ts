import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultBookingSettings } from '@/config/booking'
import { getAvailableSlots } from '@/lib/booking/getAvailableSlots'
import { getFullyBookedDates } from '@/lib/booking/getFullyBookedDates'

const mocks = vi.hoisted(() => ({
  getBookingSettings: vi.fn(),
  getPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return { ...actual, getPayload: mocks.getPayload }
})

vi.mock('@/lib/booking/settings', () => ({
  getBookingSettings: mocks.getBookingSettings,
}))

vi.mock('@/lib/security/rateLimit', () => ({
  consumeRateLimits: vi.fn(() => true),
  ipRateLimitRule: vi.fn(() => ({ key: 'ip' })),
}))

describe('available slots notice enforcement', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.getBookingSettings.mockResolvedValue({
      ...defaultBookingSettings,
      nextDayCutoffTime: '17:00',
    })
    mocks.getPayload.mockResolvedValue({
      find: vi.fn(async () => ({ docs: [] })),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('returns next-day slots before the Dublin cutoff', async () => {
    vi.setSystemTime(new Date('2026-07-20T15:59:00.000Z'))

    const result = await getAvailableSlots('2026-07-21')

    expect(result).toEqual(
      expect.objectContaining({ success: true, slots: expect.arrayContaining([expect.any(Object)]) }),
    )
    expect(mocks.getPayload).toHaveBeenCalledOnce()
  })

  it('returns no next-day slots at the exact Dublin cutoff', async () => {
    vi.setSystemTime(new Date('2026-07-20T16:00:00.000Z'))

    await expect(getAvailableSlots('2026-07-21')).resolves.toEqual({
      slots: [],
      success: true,
    })
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('keeps the calendar and slot endpoint aligned at the cutoff', async () => {
    vi.setSystemTime(new Date('2026-07-20T16:00:00.000Z'))

    const result = await getFullyBookedDates()

    expect(result).toEqual(
      expect.objectContaining({ dates: expect.arrayContaining(['2026-07-21']), success: true }),
    )
  })
})
