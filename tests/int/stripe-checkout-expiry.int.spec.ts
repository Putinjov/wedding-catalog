import type Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultBookingSettings } from '@/config/booking'
import type { Appointment } from '@/payload-types'

const mocks = vi.hoisted(() => ({
  createStripeSession: vi.fn(),
  expireStripeSession: vi.fn(),
  getAppointmentByReference: vi.fn(),
  getBookingSettings: vi.fn(),
  hasAppointmentSlotConflict: vi.fn(),
  isAppointmentSlotValid: vi.fn(),
  payloadUpdate: vi.fn(),
  retrieveStripeSession: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({ update: mocks.payloadUpdate })),
}))
vi.mock('@/lib/booking/appointmentIntegrity', () => ({
  isAppointmentSlotValid: mocks.isAppointmentSlotValid,
}))
vi.mock('@/lib/booking/getAppointment', () => ({
  getAppointmentByReference: mocks.getAppointmentByReference,
}))
vi.mock('@/lib/booking/hasAppointmentSlotConflict', () => ({
  hasAppointmentSlotConflict: mocks.hasAppointmentSlotConflict,
}))
vi.mock('@/lib/booking/settings', () => ({
  getBookingSettings: mocks.getBookingSettings,
}))
vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: mocks.createStripeSession,
        expire: mocks.expireStripeSession,
        retrieve: mocks.retrieveStripeSession,
      },
    },
  }),
}))
vi.mock('@/utilities/getURL', () => ({
  getServerSideURL: () => 'https://www.caitbridal.ie',
}))

import { createFittingCheckoutSession } from '@/lib/stripe/createFittingCheckoutSession'

function createAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    createdAt: '2030-01-01T09:00:00.000Z',
    currency: 'EUR',
    customerName: 'Test customer',
    email: 'customer@example.com',
    endAt: '2030-06-01T11:00:00.000Z',
    fittingFee: 20,
    holdExpiresAt: '2030-01-01T10:30:00.000Z',
    id: 'appointment-1',
    needsAdminReview: false,
    paymentStatus: 'unpaid',
    phone: '+353000000000',
    publicReference: `fit_${'a'.repeat(32)}`,
    purpose: 'buy',
    source: 'website',
    startAt: '2030-06-01T10:00:00.000Z',
    status: 'pending_payment',
    updatedAt: '2030-01-01T09:00:00.000Z',
    ...overrides,
  }
}

describe('Stripe Checkout hold synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-01T10:00:00.999Z'))
    const appointment = createAppointment()
    mocks.getAppointmentByReference.mockResolvedValue(appointment)
    mocks.getBookingSettings.mockResolvedValue({ ...defaultBookingSettings, holdMinutes: 45 })
    mocks.hasAppointmentSlotConflict.mockResolvedValue(false)
    mocks.isAppointmentSlotValid.mockReturnValue(true)
    mocks.payloadUpdate.mockResolvedValue(appointment)
    mocks.createStripeSession.mockImplementation(
      async (params: Stripe.Checkout.SessionCreateParams) =>
        ({
          expires_at: params.expires_at,
          id: 'cs_test_new',
          status: 'open',
          url: 'https://checkout.stripe.com/c/pay/test',
        }) as Stripe.Checkout.Session,
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes the exact shared expiry sent to Stripe into both Payload fields', async () => {
    await expect(
      createFittingCheckoutSession(createAppointment().publicReference),
    ).resolves.toEqual({
      status: 'redirect',
      url: 'https://checkout.stripe.com/c/pay/test',
    })

    expect(mocks.createStripeSession).toHaveBeenCalledWith(
      expect.objectContaining({ expires_at: 1_893_494_700 }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    )
    expect(mocks.payloadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checkoutExpiresAt: '2030-01-01T10:45:00.000Z',
          holdExpiresAt: '2030-01-01T10:45:00.000Z',
          paymentStatus: 'processing',
          status: 'payment_processing',
          stripeCheckoutSessionId: 'cs_test_new',
        }),
      }),
    )
  })

  it('does not create Stripe Checkout once the server hold reaches its boundary', async () => {
    mocks.getAppointmentByReference.mockResolvedValue(
      createAppointment({ holdExpiresAt: '2030-01-01T10:00:00.999Z' }),
    )

    await expect(
      createFittingCheckoutSession(createAppointment().publicReference),
    ).resolves.toEqual({
      message: 'This payment hold has expired. Please choose the fitting time again.',
      status: 'unavailable',
    })
    expect(mocks.createStripeSession).not.toHaveBeenCalled()
  })

  it('never creates Stripe Checkout for a confirmed zero-fee welcome booking', async () => {
    mocks.getAppointmentByReference.mockResolvedValue(
      createAppointment({
        fittingFee: 0,
        holdExpiresAt: null,
        status: 'confirmed',
      }),
    )

    await expect(
      createFittingCheckoutSession(createAppointment().publicReference),
    ).resolves.toEqual({
      message: 'No fitting fee payment is due for this appointment.',
      status: 'unavailable',
    })
    expect(mocks.createStripeSession).not.toHaveBeenCalled()
    expect(mocks.payloadUpdate).not.toHaveBeenCalled()
  })

  it('expires a drifting open session instead of silently reusing it', async () => {
    const appointment = createAppointment({
      checkoutExpiresAt: '2030-01-01T10:20:00.000Z',
      stripeCheckoutSessionId: 'cs_test_old',
    })
    mocks.getAppointmentByReference.mockResolvedValue(appointment)
    mocks.retrieveStripeSession.mockResolvedValue({
      amount_total: 2_000,
      client_reference_id: appointment.publicReference,
      currency: 'eur',
      expires_at: 1_893_493_200,
      id: 'cs_test_old',
      metadata: {
        appointmentId: String(appointment.id),
        publicReference: appointment.publicReference,
      },
      mode: 'payment',
      payment_status: 'unpaid',
      status: 'open',
      url: 'https://checkout.stripe.com/c/pay/old',
    } as Stripe.Checkout.Session)

    await expect(createFittingCheckoutSession(appointment.publicReference)).resolves.toEqual({
      status: 'redirect',
      url: 'https://checkout.stripe.com/c/pay/test',
    })

    expect(mocks.expireStripeSession).toHaveBeenCalledWith('cs_test_old')
    expect(mocks.createStripeSession).toHaveBeenCalledOnce()
  })

  it('expires a newly created session when Payload cannot bind it atomically', async () => {
    mocks.payloadUpdate.mockRejectedValue(new Error('Database unavailable'))

    await expect(
      createFittingCheckoutSession(createAppointment().publicReference),
    ).rejects.toThrow('Database unavailable')
    expect(mocks.expireStripeSession).toHaveBeenCalledWith('cs_test_new')
  })
})
