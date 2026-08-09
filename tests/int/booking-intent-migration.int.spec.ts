import { describe, expect, it, vi } from 'vitest'

import {
  down,
  up,
} from '@/migrations/20260809_101500_add_undecided_booking_intent'

function migrationArgs(count: number): Parameters<typeof up>[0] {
  return {
    payload: {
      db: {
        collections: {
          appointments: {
            collection: {
              countDocuments: vi.fn(async () => count),
            },
          },
        },
      },
      logger: { info: vi.fn() },
    },
    session: {},
  } as unknown as Parameters<typeof up>[0]
}

describe('Task 18 booking intent migration', () => {
  it('does not rewrite valid existing appointment purposes', async () => {
    const args = migrationArgs(0)

    await expect(up(args)).resolves.toBeUndefined()
    expect(args.payload.db.collections.appointments.collection.countDocuments).toHaveBeenCalledWith(
      { purpose: { $nin: ['buy', 'rent', 'undecided'] } },
      { session: args.session },
    )
  })

  it('fails closed when pre-existing purposes are unsupported', async () => {
    await expect(up(migrationArgs(1))).rejects.toThrow(
      '1 appointment(s) have an unsupported purpose',
    )
  })

  it('blocks rollback after an undecided appointment exists', async () => {
    const args = migrationArgs(1)

    await expect(down(args)).rejects.toThrow(
      '1 appointment(s) cannot be represented by the previous schema',
    )
    expect(args.payload.db.collections.appointments.collection.countDocuments).toHaveBeenCalledWith(
      { purpose: { $nin: ['buy', 'rent'] } },
      { session: args.session },
    )
  })
})
