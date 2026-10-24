import { describe, expect, it, vi } from 'vitest'

import { down, up } from '@/migrations/20261024_100000_add_appointment_reminder_index'

function fixture(indexes: Array<{ key: Record<string, number>; name: string }> = []) {
  const collection = {
    createIndex: vi.fn(async () => 'appointment_reminders_status_startAt'),
    dropIndex: vi.fn(async () => undefined),
    indexes: vi.fn(async () => indexes),
  }
  const payload = {
    db: { collections: { appointments: { collection } } },
    logger: { info: vi.fn() },
  }
  return { collection, payload }
}

describe('appointment reminder lookup index migration', () => {
  it('adds only the non-unique status and start-time index', async () => {
    const { collection, payload } = fixture()

    await up({ payload } as never)

    expect(collection.createIndex).toHaveBeenCalledWith(
      { status: 1, startAt: 1 },
      { name: 'appointment_reminders_status_startAt' },
    )
  })

  it('does not recreate a compatible existing index', async () => {
    const { collection, payload } = fixture([
      { key: { status: 1, startAt: 1 }, name: 'existing_status_startAt' },
    ])

    await up({ payload } as never)

    expect(collection.createIndex).not.toHaveBeenCalled()
  })

  it('refuses to reinterpret an incompatible index and only removes its own index on rollback', async () => {
    const incompatible = fixture([
      { key: { status: 1, endAt: 1 }, name: 'appointment_reminders_status_startAt' },
    ])
    await expect(up({ payload: incompatible.payload } as never)).rejects.toThrow('incompatible')
    expect(incompatible.collection.createIndex).not.toHaveBeenCalled()

    const compatible = fixture([
      { key: { status: 1, startAt: 1 }, name: 'appointment_reminders_status_startAt' },
    ])
    await down({ payload: compatible.payload } as never)
    expect(compatible.collection.dropIndex).toHaveBeenCalledWith(
      'appointment_reminders_status_startAt',
    )
  })
})
