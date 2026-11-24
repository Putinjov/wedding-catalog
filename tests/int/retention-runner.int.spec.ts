import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import { runRetentionCleanup } from '@/lib/privacy/runRetentionCleanup'

const mocks = vi.hoisted(() => ({ cleanup: vi.fn() }))
vi.mock('@/lib/privacy/cleanupUnpaidCancellations', () => ({ cleanupUnpaidCustomer: mocks.cleanup }))

function fixture() {
  return {
    find: vi.fn().mockResolvedValue({ docs: [{ id: 'a' }], hasNextPage: false }),
    kv: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), delete: vi.fn() },
  }
}

describe('retention runner', () => {
  beforeEach(() => { mocks.cleanup.mockReset() })

  it('retries a transient transaction conflict and completes', async () => {
    const payload = fixture()
    mocks.cleanup.mockRejectedValueOnce({ code: 112 }).mockResolvedValueOnce('removed')
    const result = await runRetentionCleanup(payload as unknown as Payload, new Date('2030-06-01T00:00:00Z'))
    expect(result).toEqual({ scanned: 1, removed: 1, hasMore: false })
    expect(mocks.cleanup).toHaveBeenCalledTimes(2)
    expect(payload.kv.delete).toHaveBeenCalled()
  })

  it('fails closed after a permanent error without advancing the cursor', async () => {
    const payload = fixture()
    mocks.cleanup.mockRejectedValue(new Error('database unavailable'))
    await expect(runRetentionCleanup(payload as unknown as Payload)).rejects.toThrow('database unavailable')
    expect(payload.kv.set).not.toHaveBeenCalled()
    expect(payload.kv.delete).not.toHaveBeenCalled()
  })
})
