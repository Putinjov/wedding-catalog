import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Appointment } from '@/payload-types'

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  getAppointmentByReference: vi.fn(),
  getBookingPayload: vi.fn(),
  hasAppointmentSlotConflict: vi.fn(),
}))

vi.mock('@/lib/booking/getAppointment', () => ({
  getAppointmentByReference: mocks.getAppointmentByReference,
}))
vi.mock('@/lib/booking/getBookingPayload', () => ({
  getBookingPayload: mocks.getBookingPayload,
}))
vi.mock('@/lib/booking/hasAppointmentSlotConflict', () => ({
  hasAppointmentSlotConflict: mocks.hasAppointmentSlotConflict,
}))
vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
  }),
}))

import {
  claimStripeEvent,
  POST,
  processSessionEvent,
} from '@/app/(frontend)/api/stripe/webhook/route'

function createAppointment(): Appointment {
  return {
    id: 'appointment-1',
    amountPaid: null,
    createdAt: '2030-01-01T00:00:00.000Z',
    currency: 'EUR',
    customerName: 'Test customer',
    email: 'customer@example.com',
    endAt: '2030-06-01T11:00:00.000Z',
    fittingFee: 20,
    needsAdminReview: false,
    paymentStatus: 'pending',
    phone: '+353000000000',
    publicReference: `fit_${'a'.repeat(32)}`,
    purpose: 'buy',
    source: 'website',
    startAt: '2030-06-01T10:00:00.000Z',
    status: 'pending',
    stripeCheckoutSessionId: 'cs_test_1',
    updatedAt: '2030-01-01T00:00:00.000Z',
  }
}

function createSession(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  const appointment = createAppointment()

  return {
    amount_total: 2000,
    client_reference_id: appointment.publicReference,
    currency: 'eur',
    customer_details: { email: appointment.email },
    id: 'cs_test_1',
    metadata: {
      appointmentId: String(appointment.id),
      publicReference: appointment.publicReference,
    },
    mode: 'payment',
    object: 'checkout.session',
    payment_intent: 'pi_test_1',
    payment_status: 'unpaid',
    status: 'open',
    ...overrides,
  } as Stripe.Checkout.Session
}

function createEvent(
  type:
    | 'checkout.session.async_payment_failed'
    | 'checkout.session.async_payment_succeeded'
    | 'checkout.session.completed'
    | 'checkout.session.expired',
  session: Stripe.Checkout.Session,
): Stripe.Event {
  return {
    api_version: '2026-06-30.basil',
    created: 1_907_000_000,
    data: { object: session },
    id: `evt_${type}`,
    livemode: false,
    object: 'event',
    pending_webhooks: 1,
    request: null,
    type,
  } as Stripe.Event
}

function createPayloadFixture() {
  return {
    create: vi.fn(),
    find: vi.fn(),
    update: vi.fn(async () => createAppointment()),
  }
}

describe('Stripe webhook reliability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    mocks.getAppointmentByReference.mockResolvedValue(createAppointment())
    mocks.hasAppointmentSlotConflict.mockResolvedValue(false)
  })

  it('rejects an invalid Stripe signature before processing data', async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        body: '{}',
        headers: { 'stripe-signature': 'invalid' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ message: 'Invalid webhook signature.' })
  })

  it('treats a previously processed event as an idempotent duplicate', async () => {
    const payload = createPayloadFixture()
    payload.find.mockResolvedValue({ docs: [{ id: 'claim-1', status: 'processed' }] })
    mocks.getBookingPayload.mockResolvedValue(payload)

    const claim = await claimStripeEvent(
      createEvent('checkout.session.completed', createSession()),
    )

    expect(claim).toBeNull()
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('confirms a paid fitting exactly through the verified event path', async () => {
    const payload = createPayloadFixture()
    mocks.getBookingPayload.mockResolvedValue(payload)
    const session = createSession({ payment_status: 'paid', status: 'complete' })

    await processSessionEvent(createEvent('checkout.session.completed', session), session)

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: 2000,
          paymentStatus: 'paid',
          status: 'confirmed',
        }),
      }),
    )
  })

  it('records asynchronous payment failure without confirming the appointment', async () => {
    const payload = createPayloadFixture()
    mocks.getBookingPayload.mockResolvedValue(payload)
    const session = createSession({ payment_status: 'unpaid', status: 'complete' })

    await processSessionEvent(
      createEvent('checkout.session.async_payment_failed', session),
      session,
    )

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'failed' }),
      }),
    )
  })

  it('accepts a verified asynchronous payment success', async () => {
    const payload = createPayloadFixture()
    mocks.getBookingPayload.mockResolvedValue(payload)
    const session = createSession({ payment_status: 'paid', status: 'complete' })

    await processSessionEvent(
      createEvent('checkout.session.async_payment_succeeded', session),
      session,
    )

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'paid', status: 'confirmed' }),
      }),
    )
  })

  it('releases an expired Checkout Session for a safe retry', async () => {
    const payload = createPayloadFixture()
    mocks.getBookingPayload.mockResolvedValue(payload)
    const session = createSession({ status: 'expired' })

    await processSessionEvent(createEvent('checkout.session.expired', session), session)

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checkoutExpiresAt: null,
          paymentStatus: 'unpaid',
          stripeCheckoutSessionId: null,
        }),
      }),
    )
  })
})
