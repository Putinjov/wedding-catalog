import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  acquireAppointmentDateMutex,
  acquireAppointmentSlotLock,
  getAppointmentDateMutexKey,
  getAppointmentSlotKey,
  releaseAppointmentDateMutex,
} from '@/lib/booking/appointmentSlotLocks'

type FakeLock = {
  id: string
  expiresAt?: string
  slotKey: string
}

function createRequestFixture(options: { activeAppointment?: boolean }) {
  const locks = new Map<string, FakeLock>()
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    const slotKey = String(data.slotKey)
    if (locks.has(slotKey)) throw new Error('E11000 duplicate key error')

    const lock = {
      id: `lock-${locks.size + 1}`,
      expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : undefined,
      slotKey,
    }
    locks.set(slotKey, lock)
    return lock
  })
  const find = vi.fn(async ({
    collection,
    where,
  }: {
    collection: string
    where?: Record<string, { equals?: unknown }>
  }) => {
    if (collection === 'appointment-slot-locks') {
      const slotKey = where?.slotKey?.equals
      return {
        docs: [...locks.values()].filter((lock) => !slotKey || lock.slotKey === slotKey),
      }
    }
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

  it('uses a deterministic Europe/Dublin key for the booking date mutex', () => {
    expect(getAppointmentDateMutexKey('2030-06-01T23:30:00.000Z')).toBe(
      'booking-date:2030-06-02',
    )
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

  it('rejects a concurrent booking while the date mutex is active', async () => {
    const fixture = createRequestFixture({})
    await acquireAppointmentDateMutex({ endAt, req: fixture.request, startAt })

    await expect(
      acquireAppointmentDateMutex({ endAt, req: fixture.request, startAt }),
    ).rejects.toThrow(/being processed for this date/i)
    expect(fixture.locks.size).toBe(1)

    await releaseAppointmentDateMutex(fixture.request)
    expect(fixture.locks.size).toBe(0)
  })

  it('reclaims an expired date mutex', async () => {
    const fixture = createRequestFixture({})
    await acquireAppointmentDateMutex({ endAt, req: fixture.request, startAt })
    const existing = [...fixture.locks.values()][0]
    existing.expiresAt = new Date(Date.now() - 60_000).toISOString()

    await expect(
      acquireAppointmentDateMutex({ endAt, req: fixture.request, startAt }),
    ).resolves.toBeTruthy()
    expect(fixture.remove).toHaveBeenCalledOnce()
    expect(fixture.locks.size).toBe(1)
  })
})
