import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'
import { describe, expect, it, vi } from 'vitest'

import { down, up } from '@/migrations/20260809_234500_add_paid_conflict_workflow'

function model(indexes: Array<Record<string, unknown>> = [], duplicates: unknown[] = []) {
  return {
    collection: {
      aggregate: vi.fn(() => ({ toArray: vi.fn(async () => duplicates) })),
      createIndex: vi.fn(async (_key, options: { name: string }) => options.name),
      dropIndex: vi.fn(async () => undefined),
      indexes: vi.fn(async () => indexes),
    },
  }
}

function migrationArgs({
  appointmentIndexes = [],
  auditIndexes = [],
  duplicates = [],
}: {
  appointmentIndexes?: Array<Record<string, unknown>>
  auditIndexes?: Array<Record<string, unknown>>
  duplicates?: unknown[]
} = {}) {
  const appointments = model(appointmentIndexes, duplicates)
  const audits = model(auditIndexes)
  const payload = {
    db: { collections: { appointments, 'appointment-audits': audits } },
    logger: { info: vi.fn() },
  }
  return { appointments, audits, payload }
}

describe('paid conflict migration', () => {
  it('adds only sparse unique operational indexes', async () => {
    const fixture = migrationArgs()

    await up({ payload: fixture.payload } as unknown as MigrateUpArgs)

    expect(fixture.appointments.collection.createIndex).toHaveBeenCalledWith(
      { stripePaymentIntentId: 1 },
      { name: 'stripePaymentIntentId_1', sparse: true, unique: true },
    )
    expect(fixture.appointments.collection.createIndex).toHaveBeenCalledWith(
      { stripeRefundId: 1 },
      { name: 'stripeRefundId_1', sparse: true, unique: true },
    )
    expect(fixture.audits.collection.createIndex).toHaveBeenCalledWith(
      { idempotencyKey: 1 },
      { name: 'idempotencyKey_1', sparse: true, unique: true },
    )
  })

  it('aborts before indexing duplicate PaymentIntent values', async () => {
    const fixture = migrationArgs({ duplicates: [{ _id: 'pi_duplicate', count: 2 }] })

    await expect(up({ payload: fixture.payload } as unknown as MigrateUpArgs)).rejects.toThrow(
      /duplicate stripePaymentIntentId/i,
    )
    expect(fixture.appointments.collection.createIndex).not.toHaveBeenCalled()
  })

  it('drops only Task 23 indexes during rollback', async () => {
    const definition = (field: string, name: string) => ({
      key: { [field]: 1 },
      name,
      sparse: true,
      unique: true,
    })
    const fixture = migrationArgs({
      appointmentIndexes: [
        definition('stripePaymentIntentId', 'stripePaymentIntentId_1'),
        definition('stripeRefundId', 'stripeRefundId_1'),
      ],
      auditIndexes: [definition('idempotencyKey', 'idempotencyKey_1')],
    })

    await down({ payload: fixture.payload } as unknown as MigrateDownArgs)

    expect(fixture.appointments.collection.dropIndex).toHaveBeenCalledTimes(2)
    expect(fixture.audits.collection.dropIndex).toHaveBeenCalledWith('idempotencyKey_1')
  })
})
