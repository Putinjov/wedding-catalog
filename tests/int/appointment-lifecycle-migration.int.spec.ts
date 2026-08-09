import { describe, expect, it, vi } from 'vitest'

import {
  down,
  up,
} from '@/migrations/20260809_210000_formalize_appointment_lifecycle'

function migrationArgs(count = 0): Parameters<typeof up>[0] {
  return {
    payload: {
      db: {
        collections: {
          appointments: {
            collection: {
              countDocuments: vi.fn(async () => count),
              updateMany: vi.fn(async () => ({ modifiedCount: 0 })),
            },
          },
        },
      },
      logger: { info: vi.fn() },
    },
    session: {},
  } as unknown as Parameters<typeof up>[0]
}

describe('Task 27 appointment lifecycle migration', () => {
  it('maps legacy pending and no-show values without touching customer data', async () => {
    const args = migrationArgs()

    await expect(up(args)).resolves.toBeUndefined()
    const updateMany = args.payload.db.collections.appointments.collection.updateMany
    expect(updateMany).toHaveBeenCalledWith(
      { status: 'pending', paymentStatus: 'pending' },
      { $set: { paymentStatus: 'processing', status: 'payment_processing' } },
      { session: args.session },
    )
    expect(updateMany).toHaveBeenCalledWith(
      { status: 'no-show' },
      { $set: { status: 'no_show' } },
      { session: args.session },
    )
  })

  it('maps paid pending records requiring review to the conflict state', async () => {
    const args = migrationArgs()

    await up(args)

    expect(args.payload.db.collections.appointments.collection.updateMany).toHaveBeenCalledWith(
      { status: 'pending', paymentStatus: 'paid', needsAdminReview: true },
      { $set: { status: 'payment_received_conflict' } },
      { session: args.session },
    )
  })

  it('fails closed on an ambiguous legacy combination', async () => {
    await expect(up(migrationArgs(1))).rejects.toThrow(
      '1 appointment(s) have an ambiguous legacy lifecycle',
    )
  })

  it('restores representable legacy values on rollback', async () => {
    const args = migrationArgs()

    await expect(down(args)).resolves.toBeUndefined()
    expect(args.payload.db.collections.appointments.collection.updateMany).toHaveBeenCalledWith(
      { status: { $in: ['pending_payment', 'payment_processing', 'payment_failed'] } },
      { $set: { status: 'pending' } },
      { session: args.session },
    )
    expect(args.payload.db.collections.appointments.collection.updateMany).toHaveBeenCalledWith(
      { paymentStatus: 'processing' },
      { $set: { paymentStatus: 'pending' } },
      { session: args.session },
    )
  })

  it('blocks rollback when a new lifecycle cannot be represented safely', async () => {
    await expect(down(migrationArgs(2))).rejects.toThrow(
      '2 appointment(s) cannot be represented safely by the legacy lifecycle',
    )
  })
})
