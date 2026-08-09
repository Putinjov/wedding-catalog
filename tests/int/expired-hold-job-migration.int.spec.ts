import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'
import { describe, expect, it, vi } from 'vitest'

import {
  down,
  up,
} from '@/migrations/20260809_230000_add_expired_hold_job_concurrency'

function migrationArgs(indexes: Array<{ key?: Record<string, number>; name?: string }> = []) {
  const collection = {
    createIndex: vi.fn(async () => 'concurrencyKey_1'),
    dropIndex: vi.fn(async () => undefined),
    indexes: vi.fn(async () => indexes),
  }
  const payload = {
    db: {
      collections: {
        'payload-jobs': { collection },
      },
    },
    logger: { info: vi.fn() },
  }

  return { collection, payload }
}

describe('expired hold job concurrency migration', () => {
  it('creates the nullable Payload job concurrency index without changing business data', async () => {
    const args = migrationArgs()

    await up({ payload: args.payload } as unknown as MigrateUpArgs)

    expect(args.collection.createIndex).toHaveBeenCalledWith(
      { concurrencyKey: 1 },
      { name: 'concurrencyKey_1' },
    )
  })

  it('creates the index when the internal jobs collection does not exist yet', async () => {
    const args = migrationArgs()
    args.collection.indexes.mockRejectedValueOnce({ code: 26 })

    await up({ payload: args.payload } as unknown as MigrateUpArgs)

    expect(args.collection.createIndex).toHaveBeenCalledWith(
      { concurrencyKey: 1 },
      { name: 'concurrencyKey_1' },
    )
  })

  it('is safe when the compatible index already exists', async () => {
    const args = migrationArgs([{ key: { concurrencyKey: 1 }, name: 'concurrencyKey_1' }])

    await up({ payload: args.payload } as unknown as MigrateUpArgs)

    expect(args.collection.createIndex).not.toHaveBeenCalled()
  })

  it('aborts instead of silently replacing an incompatible index', async () => {
    const args = migrationArgs([{ key: { other: 1 }, name: 'concurrencyKey_1' }])

    await expect(up({ payload: args.payload } as unknown as MigrateUpArgs)).rejects.toThrow(
      /incompatible definition/i,
    )
    expect(args.collection.createIndex).not.toHaveBeenCalled()
  })

  it('drops only the Task 22 concurrency index on rollback', async () => {
    const args = migrationArgs([{ key: { concurrencyKey: 1 }, name: 'concurrencyKey_1' }])

    await down({ payload: args.payload } as unknown as MigrateDownArgs)

    expect(args.collection.dropIndex).toHaveBeenCalledWith('concurrencyKey_1')
  })
})
