import { describe, expect, it, vi } from 'vitest'

import { down, up } from '@/migrations/20261024_120000_add_customer_profiles'

function fixture({
  appointmentIndexes = [],
  customerIndexes = [],
  linkedCount = 0,
  profileCount = 0,
}: {
  appointmentIndexes?: Array<{ key: Record<string, number>; name: string; unique?: boolean }>
  customerIndexes?: Array<{ key: Record<string, number>; name: string; unique?: boolean }>
  linkedCount?: number
  profileCount?: number
} = {}) {
  const appointments = {
    countDocuments: vi.fn(async () => linkedCount),
    createIndex: vi.fn(async () => 'customer_1'),
    dropIndex: vi.fn(async () => undefined),
    indexes: vi.fn(async () => appointmentIndexes),
  }
  const customers = {
    countDocuments: vi.fn(async () => profileCount),
    createIndex: vi.fn(async () => 'email_1'),
    dropIndex: vi.fn(async () => undefined),
    indexes: vi.fn(async () => customerIndexes),
  }
  const payload = {
    db: {
      collections: {
        appointments: { collection: appointments },
        customers: { collection: customers },
      },
    },
    logger: { info: vi.fn() },
  }
  return { appointments, customers, payload }
}

describe('customer profile migration', () => {
  it('adds only the identity and relationship indexes without rewriting records', async () => {
    const test = fixture()
    await up({ payload: test.payload } as never)

    expect(test.customers.createIndex).toHaveBeenCalledWith(
      { email: 1 },
      { name: 'email_1', unique: true },
    )
    expect(test.appointments.createIndex).toHaveBeenCalledWith(
      { customer: 1 },
      { name: 'customer_1' },
    )
    expect(test.appointments).not.toHaveProperty('updateMany')
  })

  it('refuses an incompatible existing profile index', async () => {
    const test = fixture({ customerIndexes: [{ key: { email: 1 }, name: 'email_1' }] })
    await expect(up({ payload: test.payload } as never)).rejects.toThrow(/incompatible definition/i)
    expect(test.appointments.createIndex).not.toHaveBeenCalled()
  })

  it('does not remove indexes after profiles or linked appointments exist', async () => {
    const test = fixture({ profileCount: 1 })
    await expect(down({ payload: test.payload } as never)).rejects.toThrow(/reviewed data plan/i)
    expect(test.customers.dropIndex).not.toHaveBeenCalled()
    expect(test.appointments.dropIndex).not.toHaveBeenCalled()
  })

  it('removes only matching unused indexes on rollback', async () => {
    const test = fixture({
      appointmentIndexes: [{ key: { customer: 1 }, name: 'customer_1' }],
      customerIndexes: [{ key: { email: 1 }, name: 'email_1', unique: true }],
    })
    await down({ payload: test.payload } as never)
    expect(test.customers.dropIndex).toHaveBeenCalledWith('email_1')
    expect(test.appointments.dropIndex).toHaveBeenCalledWith('customer_1')
  })
})
