import type Stripe from 'stripe'
import type { PayloadRequest, TypedUser } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Appointment } from '@/payload-types'

const stripeMocks = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
}))

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: () => ({ refunds: stripeMocks }),
}))

import {
  applyPaidConflictAction,
  reconcilePaidConflictRefund,
} from '@/lib/admin/appointments/paidConflict'

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appointment-1',
    amountPaid: 2000,
    createdAt: '2026-08-09T10:00:00.000Z',
    currency: 'EUR',
    customerName: 'Customer',
    email: 'customer@example.com',
    endAt: '2026-08-20T11:00:00.000Z',
    fittingFee: 20,
    needsAdminReview: true,
    paymentStatus: 'paid',
    phone: '+353100000000',
    publicReference: `fit_${'a'.repeat(32)}`,
    purpose: 'buy',
    reviewReason: 'Admin review required.',
    source: 'website',
    startAt: '2026-08-20T10:00:00.000Z',
    status: 'payment_received_conflict',
    stripePaymentIntentId: 'pi_test_1',
    updatedAt: '2026-08-09T10:00:00.000Z',
    ...overrides,
  }
}

function user(role: 'manager' | 'owner' | 'staff'): TypedUser {
  return { collection: 'users', email: `${role}@example.com`, id: `${role}-1`, role }
}

function requestFixture(existingAudit = false) {
  let current = appointment()
  const payload = {
    find: vi.fn(async ({ collection }: { collection: string }) =>
      collection === 'appointment-audits'
        ? { docs: existingAudit ? [{ id: 'audit-1' }] : [], totalDocs: existingAudit ? 1 : 0 }
        : { docs: [], totalDocs: 0 },
    ),
    findByID: vi.fn(async () => current),
    logger: { error: vi.fn(), warn: vi.fn() },
    update: vi.fn(async ({ data }: { data: Partial<Appointment> }) => {
      current = { ...current, ...data }
      return current
    }),
  }
  return { payload, req: { payload } as unknown as PayloadRequest }
}

function refund(overrides: Partial<Stripe.Refund> = {}): Stripe.Refund {
  return {
    amount: 2000,
    created: 1_786_262_400,
    currency: 'eur',
    id: 're_test_1',
    metadata: { appointmentId: 'appointment-1', workflow: 'paid-conflict-full-refund' },
    object: 'refund',
    payment_intent: 'pi_test_1',
    status: 'succeeded',
    ...overrides,
  } as Stripe.Refund
}

describe('paid conflict workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stripeMocks.list.mockResolvedValue({ data: [] })
    stripeMocks.create.mockResolvedValue(refund())
  })

  it('uses the exact amount paid and a Stripe idempotency key for a full refund', async () => {
    const { payload, req } = requestFixture()

    const result = await applyPaidConflictAction({
      id: 'appointment-1',
      input: {
        action: 'refund',
        operationKey: '11111111-1111-4111-8111-111111111111',
      },
      req,
      user: user('manager'),
    })

    expect(stripeMocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2000, payment_intent: 'pi_test_1' }),
      {
        idempotencyKey:
          'fit-conflict-refund:appointment-1:11111111-1111-4111-8111-111111111111',
      },
    )
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conflictResolution: 'refunded',
          paymentStatus: 'refunded',
          refundAmount: 2000,
          status: 'refunded',
        }),
      }),
    )
    expect(result.needsAdminReview).toBe(false)
  })

  it('prevents staff from creating a refund', async () => {
    const { req } = requestFixture()

    await expect(
      applyPaidConflictAction({
        id: 'appointment-1',
        input: {
          action: 'refund',
          operationKey: '22222222-2222-4222-8222-222222222222',
        },
        req,
        user: user('staff'),
      }),
    ).rejects.toMatchObject({ status: 403 })
    expect(stripeMocks.create).not.toHaveBeenCalled()
  })

  it('returns the current appointment without repeating a completed operation', async () => {
    const { payload, req } = requestFixture(true)

    await applyPaidConflictAction({
      id: 'appointment-1',
      input: {
        action: 'confirm',
        operationKey: '33333333-3333-4333-8333-333333333333',
      },
      req,
      user: user('staff'),
    })

    expect(payload.update).not.toHaveBeenCalled()
  })

  it('records only the contact channel in audit metadata', async () => {
    const { payload, req } = requestFixture()

    await applyPaidConflictAction({
      id: 'appointment-1',
      input: {
        action: 'contact',
        channel: 'email',
        operationKey: '44444444-4444-4444-8444-444444444444',
      },
      req,
      user: user('staff'),
    })

    const context = payload.update.mock.calls[0]?.[0]?.context
    expect(context.appointmentAudit.metadata).toEqual(
      expect.objectContaining({ contactMethod: 'email' }),
    )
    expect(JSON.stringify(context.appointmentAudit.metadata)).not.toContain('customer@example.com')
    expect(JSON.stringify(context.appointmentAudit.metadata)).not.toContain('+353')
  })

  it('keeps a pending refund visible without prematurely changing paid state', async () => {
    const current = appointment()
    const payload = {
      find: vi.fn(async () => ({ docs: [current], totalDocs: 1 })),
      logger: { warn: vi.fn() },
      update: vi.fn(async ({ data }: { data: Partial<Appointment> }) => ({
        ...current,
        ...data,
      })),
    }

    await reconcilePaidConflictRefund({
      eventType: 'refund.updated',
      payload: payload as never,
      refund: refund({ status: 'pending' }),
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          needsAdminReview: true,
          refundStatus: 'pending',
          reviewReason: expect.stringMatching(/still processing/i),
        }),
      }),
    )
    expect(payload.update.mock.calls[0]?.[0]?.data).not.toHaveProperty('paymentStatus')
  })

  it('reconciles a successful full refund into a terminal refunded state', async () => {
    const current = appointment({ refundStatus: 'pending', stripeRefundId: 're_test_1' })
    const payload = {
      find: vi.fn(async () => ({ docs: [current], totalDocs: 1 })),
      logger: { warn: vi.fn() },
      update: vi.fn(async ({ data }: { data: Partial<Appointment> }) => ({
        ...current,
        ...data,
      })),
    }

    const result = await reconcilePaidConflictRefund({
      eventType: 'refund.updated',
      payload: payload as never,
      refund: refund(),
    })

    expect(result).toEqual(
      expect.objectContaining({
        needsAdminReview: false,
        paymentStatus: 'refunded',
        refundStatus: 'succeeded',
        status: 'refunded',
      }),
    )
  })
})
