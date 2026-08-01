import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  acquireAppointmentSlotLock,
  getAppointmentSlotKey,
} from '@/lib/booking/appointmentSlotLocks'

type FakeLock = {
  id: string
  slotKey: string
}

function createRequestFixture(options: { activeAppointment?: boolean }) {
  const locks = new Map<string, FakeLock>()
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    const slotKey = String(data.slotKey)
    if (locks.has(slotKey)) throw new Error('E11000 duplicate key error')

    const lock = { id: `lock-${locks.size + 1}`, slotKey }
    locks.set(slotKey, lock)
    return lock
  })
  const find = vi.fn(async ({ collection }: { collection: string }) => {
    if (collection === 'appointment-slot-locks') return { docs: [...locks.values()] }
    if (!options.activeAppointment) return { docs: [] }

    return {
      docs: [
        {
          holdExpiresAt: new Date(Date.now() + 60_000).toISOString(),
          paymentStatus: 'unpaid',
          source: 'website',
          status: 'pending',
        },
      ],
    }
  })
  const remove = vi.fn(async ({ id }: { id: string }) => {
    for (const [slotKey, lock] of locks) {
      if (lock.id === id) locks.delete(slotKey)
    }
    return { id }
  })
  const payload = { create, delete: remove, find }

  return {
    locks,
    remove,
    request: { payload } as unknown as PayloadRequest,
  }
}

describe('appointment slot locks', () => {
  const startAt = '2030-06-01T10:00:00.000Z'
  const endAt = '2030-06-01T11:00:00.000Z'

  it('uses a deterministic unique key for an exact fitting slot', () => {
    expect(getAppointmentSlotKey(startAt, endAt)).toBe(`${startAt}|${endAt}`)
  })

  it('rejects a second claim while the existing appointment blocks the slot', async () => {
    const fixture = createRequestFixture({ activeAppointment: true })
    await acquireAppointmentSlotLock({ endAt, req: fixture.request, startAt })

    await expect(
      acquireAppointmentSlotLock({ endAt, req: fixture.request, startAt }),
    ).rejects.toThrow('already reserved')
    expect(fixture.locks.size).toBe(1)
  })

  it('reclaims a stale lock whose appointment no longer blocks the slot', async () => {
    const fixture = createRequestFixture({ activeAppointment: false })
    await acquireAppointmentSlotLock({ endAt, req: fixture.request, startAt })

    await expect(
      acquireAppointmentSlotLock({ endAt, req: fixture.request, startAt }),
    ).resolves.toBeTruthy()
    expect(fixture.remove).toHaveBeenCalledOnce()
    expect(fixture.locks.size).toBe(1)
  })
})
