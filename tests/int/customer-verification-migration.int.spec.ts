import { describe, expect, it, vi } from 'vitest'

import { down, up } from '@/migrations/20261025_180000_add_customer_verification_claims'

function fixture(indexes: Array<{
  expireAfterSeconds?: number
  key: Record<string, number>
  name: string
  unique?: boolean
}> = [], count = 0) {
  const collection = {
    countDocuments: vi.fn(async () => count),
    createIndex: vi.fn(async () => undefined),
    dropIndex: vi.fn(async () => undefined),
    indexes: vi.fn(async () => indexes),
  }
  const payload = {
    db: { collections: { 'customer-verification-claims': { collection } } },
    logger: { info: vi.fn() },
  }
  return { collection, payload }
}

describe('customer verification claim migration', () => {
  it('creates unique redemption and expiry indexes without rewriting data', async () => {
    const test = fixture()
    await up({ payload: test.payload } as never)
    expect(test.collection.createIndex).toHaveBeenCalledWith(
      { claimKey: 1 }, { name: 'claimKey_1', unique: true },
    )
    expect(test.collection.createIndex).toHaveBeenCalledWith(
      { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt_1' },
    )
    expect(test.collection).not.toHaveProperty('updateMany')
  })

  it('refuses an incompatible expiry index', async () => {
    const test = fixture([
      { key: { claimKey: 1 }, name: 'claimKey_1', unique: true },
      { key: { expiresAt: 1 }, name: 'expiresAt_1' },
    ])
    await expect(up({ payload: test.payload } as never)).rejects.toThrow(/incompatible definition/i)
  })

  it('preserves active one-time claims on rollback', async () => {
    const test = fixture([], 1)
    await expect(down({ payload: test.payload } as never)).rejects.toThrow(/reviewed data plan/i)
    expect(test.collection.dropIndex).not.toHaveBeenCalled()
  })
})
