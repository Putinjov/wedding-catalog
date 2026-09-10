import { describe, expect, it, vi } from 'vitest'
import { revalidateTag, unstable_cache } from 'next/cache'

import { revalidateBookingSettings } from '@/BookingSettings/hooks/revalidateBookingSettings'
import { getBookingSettings } from '@/lib/booking/settings'

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn(() => vi.fn()),
  revalidateTag: vi.fn(),
}))

describe('booking schedule cache rollout', () => {
  it('uses a fresh cache identity while retaining the existing Payload invalidation tag', () => {
    expect(getBookingSettings).toBeTypeOf('function')
    expect(unstable_cache).toHaveBeenCalledWith(
      expect.any(Function),
      ['booking-settings', 'schedule-20260909'],
      { tags: ['global_booking-settings'] },
    )
    revalidateBookingSettings({
      context: {},
      doc: {},
      req: { payload: { logger: { info: vi.fn() } } },
    } as unknown as Parameters<typeof revalidateBookingSettings>[0])
    expect(revalidateTag).toHaveBeenCalledWith('global_booking-settings', 'max')
  })
})
