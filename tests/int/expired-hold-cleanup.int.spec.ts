import type { Payload, PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { isAppointmentBlockingSlot } from '@/lib/booking/appointmentConflicts'
import {
  cleanupExpiredAppointmentHolds,
  expiredHoldCleanupBatchSize,
  isExpiredHoldCleanupCandidate,
} from '@/lib/booking/cleanupExpiredAppointmentHolds'
import type { Appointment } from '@/payload-types'

const now = new Date('2030-06-01T10:00:00.000Z')

function appointment(id: string, overrides: Partial<Appointment> = {}): Appointment {
  return {
    id,
    createdAt: '2030-06-01T08:00:00.000Z',
    currency: 'EUR',
    customerName: 'Synthetic customer',
    email: 'synthetic@example.com',
    endAt: '2030-06-01T12:00:00.000Z',
    fittingFee: 20,
    holdExpiresAt: '2030-06-01T09:59:59.999Z',
    paymentStatus: 'unpaid',
    phone: '+353000000000',
    publicReference: `fit_${id.padEnd(32, '0').slice(0, 32)}`,
    purpose: 'buy',
    slotLock: `lock-${id}`,
    source: 'website',
    startAt: '2030-06-01T11:00:00.000Z',
    status: 'pending_payment',
    updatedAt: '2030-06-01T08:00:00.000Z',
    ...overrides,
  }
}

function createPayloadFixture(initialAppointments: Appointment[]) {
  const appointments = new Map(initialAppointments.map((item) => [String(item.id), item]))
  const find = vi.fn(async (args: {
    limit?: number
    where?: { id?: { equals?: unknown } }
  }) => {
    const id = args.where?.id?.equals
    if (id) {
      const current = appointments.get(String(id))
      return { docs: current ? [current] : [], hasNextPage: false }
    }

    const eligible = [...appointments.values()].filter((item) =>
      isExpiredHoldCleanupCandidate(item, now),
    )
    const limit = args.limit ?? eligible.length
    return {
      docs: eligible.slice(0, limit),
      hasNextPage: eligible.length > limit,
    }
  })
  const update = vi.fn(async (args: {
    context?: unknown
    data: Partial<Appointment>
    id: string
  }) => {
    const current = appointments.get(String(args.id))
    if (!current) throw new Error('Appointment not found.')

    const updated: Appointment = {
      ...current,
      ...args.data,
      slotLock: null,
    }
    appointments.set(String(args.id), updated)
    return updated
  })
  const payload = { find, update } as unknown as Payload
  const req = { payload } as PayloadRequest

  return { appointments, find, payload, req, update }
}

describe('expired appointment hold cleanup', () => {
  it('only selects expired unpaid or failed website holds', () => {
    expect(isExpiredHoldCleanupCandidate(appointment('eligible'), now)).toBe(true)
    expect(
      isExpiredHoldCleanupCandidate(
        appointment('failed', { paymentStatus: 'failed', status: 'payment_failed' }),
        now,
      ),
    ).toBe(true)
    expect(
      isExpiredHoldCleanupCandidate(
        appointment('processing', {
          paymentStatus: 'processing',
          status: 'payment_processing',
        }),
        now,
      ),
    ).toBe(false)
    expect(
      isExpiredHoldCleanupCandidate(
        appointment('paid', { paymentStatus: 'paid', status: 'confirmed' }),
        now,
      ),
    ).toBe(false)
    expect(isExpiredHoldCleanupCandidate(appointment('admin', { source: 'admin' }), now)).toBe(
      false,
    )
    expect(
      isExpiredHoldCleanupCandidate(
        appointment('active', { holdExpiresAt: '2030-06-01T10:00:00.001Z' }),
        now,
      ),
    ).toBe(false)
  })

  it('expires a bounded batch, clears stale Checkout binding, and releases slot locks', async () => {
    const fixture = createPayloadFixture([
      appointment('one', {
        checkoutExpiresAt: '2030-06-01T09:59:59.999Z',
        stripeCheckoutSessionId: 'cs_one',
      }),
      appointment('two'),
      appointment('three'),
      appointment('paid', { paymentStatus: 'paid', status: 'confirmed' }),
      appointment('processing', {
        paymentStatus: 'processing',
        status: 'payment_processing',
      }),
    ])

    const result = await cleanupExpiredAppointmentHolds({
      batchSize: 2,
      now,
      payload: fixture.payload,
      req: fixture.req,
    })

    expect(result).toEqual({ expired: 2, hasMore: true, scanned: 2, skipped: 0 })
    expect(fixture.update).toHaveBeenCalledTimes(2)
    expect(fixture.update).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          appointmentPayment: expect.objectContaining({ origin: 'internal-maintenance' }),
        }),
        data: {
          checkoutExpiresAt: null,
          status: 'expired',
          stripeCheckoutSessionId: null,
        },
      }),
    )

    const expired = fixture.appointments.get('one')
    expect(expired).toEqual(
      expect.objectContaining({
        checkoutExpiresAt: null,
        slotLock: null,
        status: 'expired',
        stripeCheckoutSessionId: null,
      }),
    )
    expect(isAppointmentBlockingSlot(expired!, now)).toBe(false)
    expect(fixture.appointments.get('paid')?.status).toBe('confirmed')
    expect(fixture.appointments.get('processing')?.status).toBe('payment_processing')
  })

  it('is idempotent when rerun', async () => {
    const fixture = createPayloadFixture([appointment('one')])

    await cleanupExpiredAppointmentHolds({ now, payload: fixture.payload, req: fixture.req })
    const rerun = await cleanupExpiredAppointmentHolds({
      now,
      payload: fixture.payload,
      req: fixture.req,
    })

    expect(rerun).toEqual({ expired: 0, hasMore: false, scanned: 0, skipped: 0 })
    expect(fixture.update).toHaveBeenCalledOnce()
  })

  it('skips an appointment that becomes paid after candidate discovery', async () => {
    const fixture = createPayloadFixture([appointment('one')])
    fixture.find.mockImplementationOnce(async () => ({
      docs: [appointment('one')],
      hasNextPage: false,
    }))
    fixture.appointments.set(
      'one',
      appointment('one', { paymentStatus: 'paid', status: 'confirmed' }),
    )

    const result = await cleanupExpiredAppointmentHolds({
      now,
      payload: fixture.payload,
      req: fixture.req,
    })

    expect(result).toEqual({ expired: 0, hasMore: false, scanned: 1, skipped: 1 })
    expect(fixture.update).not.toHaveBeenCalled()
    expect(fixture.appointments.get('one')).toEqual(
      expect.objectContaining({ paymentStatus: 'paid', status: 'confirmed' }),
    )
  })

  it('rejects unbounded batch sizes', async () => {
    const fixture = createPayloadFixture([])

    await expect(
      cleanupExpiredAppointmentHolds({
        batchSize: expiredHoldCleanupBatchSize + 1,
        now,
        payload: fixture.payload,
        req: fixture.req,
      }),
    ).rejects.toThrow(/batch size/i)
    expect(fixture.find).not.toHaveBeenCalled()
  })
})
