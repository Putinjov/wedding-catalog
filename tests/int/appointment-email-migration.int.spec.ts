import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'
import { describe, expect, it, vi } from 'vitest'

import { down, up } from '@/migrations/20260810_003000_add_email_delivery_queue'

function fixture(indexes: Array<Record<string, unknown>> = [], duplicates: unknown[] = []) {
  const collection = {
    aggregate: vi.fn(() => ({ toArray: vi.fn(async () => duplicates) })),
    createIndex: vi.fn(async (_key, options: { name: string }) => options.name),
    dropIndex: vi.fn(async () => undefined),
    indexes: vi.fn(async () => indexes),
  }
  const payload = {
    db: { collections: { 'email-deliveries': { collection } } },
    logger: { info: vi.fn() },
  }
  return { collection, payload }
}

describe('appointment email delivery migration', () => {
  it('creates the unique idempotency and bounded operational query indexes', async () => {
    const test = fixture()

    await up({ payload: test.payload } as unknown as MigrateUpArgs)

    expect(test.collection.createIndex).toHaveBeenCalledWith(
      { idempotencyKey: 1 },
      { name: 'idempotencyKey_1', unique: true },
    )
    expect(test.collection.createIndex).toHaveBeenCalledWith(
      { status: 1, createdAt: 1 },
      { name: 'status_1_createdAt_1' },
    )
  })

  it('aborts before indexing duplicate idempotency keys', async () => {
    const test = fixture([], [{ _id: 'duplicate', count: 2 }])

    await expect(up({ payload: test.payload } as unknown as MigrateUpArgs)).rejects.toThrow(
      /duplicate email idempotency keys/i,
    )
    expect(test.collection.createIndex).not.toHaveBeenCalled()
  })

  it('rolls back indexes without deleting delivery records', async () => {
    const test = fixture([
      { key: { idempotencyKey: 1 }, name: 'idempotencyKey_1', unique: true },
      { key: { appointment: 1, createdAt: -1 }, name: 'appointment_1_createdAt_-1' },
      { key: { status: 1, createdAt: 1 }, name: 'status_1_createdAt_1' },
      { key: { jobId: 1 }, name: 'jobId_1' },
    ])

    await down({ payload: test.payload } as unknown as MigrateDownArgs)

    expect(test.collection.dropIndex).toHaveBeenCalledTimes(4)
    expect(test.collection).not.toHaveProperty('drop')
  })
})
