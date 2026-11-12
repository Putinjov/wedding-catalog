import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  getPayload: vi.fn(),
  readVerifiedEmailSession: vi.fn(),
  resolveRepeatBookingDecision: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: mocks.getPayload,
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'test-cookie' }) }),
  headers: async () => new Headers(),
}))
vi.mock('@/config/env', () => ({
  getServerEnvironment: () => ({ PAYLOAD_SECRET: 'test-secret-with-at-least-thirty-two-characters' }),
}))
vi.mock('@/config/site', () => ({
  siteConfig: { currency: 'EUR', fittingFee: 20, standardFittingFee: 20 },
}))
vi.mock('@/lib/customers/emailVerification', () => ({
  readVerifiedEmailSession: mocks.readVerifiedEmailSession,
  verifiedEmailCookieName: 'booking_verified_email',
}))
vi.mock('@/lib/customers/repeatBooking', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/customers/repeatBooking')>()),
  resolveRepeatBookingDecision: mocks.resolveRepeatBookingDecision,
}))
vi.mock('@/lib/booking/settings', () => ({
  getBookingSettings: async () => ({ holdMinutes: 30 }),
}))
vi.mock('@/lib/booking/date', () => ({
  getBookingScheduleLabel: () => 'Choose an open day.',
  getBookingWindowLabel: () => 'Choose an available day.',
  getSlotDateTimes: () => ({
    endAt: new Date('2099-01-02T11:30:00.000Z'),
    startAt: new Date('2099-01-02T10:00:00.000Z'),
  }),
  isClosedDate: () => false,
  isDateWithinBookingWindow: () => true,
  isValidSlotTime: () => true,
}))
vi.mock('@/lib/booking/noticeRules', () => ({
  getBookingNoticeMessage: () => '',
  getBookingNoticeViolation: () => null,
}))
vi.mock('@/lib/booking/hasAppointmentSlotConflict', () => ({
  hasAppointmentSlotConflict: async () => false,
}))
vi.mock('@/lib/security/rateLimit', () => ({
  consumeRateLimits: () => true,
  identifierRateLimitRule: () => ({}),
  ipRateLimitRule: () => ({}),
}))

import { createPendingAppointment } from '@/lib/booking/createAppointment'
import { checkFollowUpEligibility, getBookingFeeQuote } from '@/lib/booking/getBookingFeeQuote'
import { validateAppointmentCustomer } from '@/lib/customers/appointmentCustomer'

const input = {
  customerName: 'Test Customer',
  date: '2099-01-02',
  email: 'BRIDE@example.com',
  phone: '+353100000000',
  privacyAcknowledged: true,
  purpose: 'buy',
  time: '10:00',
}

describe('server-authoritative repeat booking creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.readVerifiedEmailSession.mockReturnValue('bride@example.com')
    mocks.getPayload.mockResolvedValue({ create: mocks.create })
    mocks.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data)
  })

  it('rejects an unverified address before reading private customer data', async () => {
    mocks.readVerifiedEmailSession.mockReturnValue(null)
    const result = await createPendingAppointment({ ...input, purpose: 'follow_up' })
    expect(result.success).toBe(false)
    expect(mocks.getPayload).not.toHaveBeenCalled()
    expect(mocks.resolveRepeatBookingDecision).not.toHaveBeenCalled()
  })

  it('confirms a free linked repeat visit without creating a Stripe hold', async () => {
    mocks.resolveRepeatBookingDecision.mockResolvedValue({
      customer: { id: 'customer-1' }, kind: 'free',
    })
    const result = await createPendingAppointment({ ...input, purpose: 'follow_up' })
    expect(result.success).toBe(true)
    const appointment = mocks.create.mock.calls[0]?.[0].data
    expect(appointment).toEqual(expect.objectContaining({
      customer: 'customer-1',
      email: 'bride@example.com',
      fittingFee: 0,
      paymentStatus: 'unpaid',
      status: 'confirmed',
    }))
    expect(appointment).not.toHaveProperty('holdExpiresAt')
  })

  it('requires payment for a first or expired visit when the welcome offer ends', async () => {
    mocks.resolveRepeatBookingDecision.mockResolvedValue({
      customer: { id: 'customer-1' }, kind: 'standard',
    })
    const result = await createPendingAppointment(input)
    expect(result.success).toBe(true)
    expect(mocks.create.mock.calls[0]?.[0].data).toEqual(expect.objectContaining({
      fittingFee: 20,
      paymentStatus: 'unpaid',
      status: 'pending_payment',
      holdExpiresAt: expect.any(String),
    }))
  })

  it('closes online booking after a confirmed purchase and creates nothing', async () => {
    mocks.resolveRepeatBookingDecision.mockResolvedValue({
      customer: { id: 'customer-1' }, kind: 'closed',
    })
    const result = await createPendingAppointment({ ...input, purpose: 'follow_up' })
    expect(result).toEqual(expect.objectContaining({ success: false }))
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('never silently charges an ineligible follow-up or creates a profile for it', async () => {
    mocks.resolveRepeatBookingDecision.mockResolvedValue({ customer: null, kind: 'standard' })
    const result = await createPendingAppointment({ ...input, purpose: 'follow_up' })
    expect(result).toEqual(expect.objectContaining({ success: false, message: expect.stringContaining('free follow-up') }))
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it.each(['buy', 'rent'])('accepts guest %s without verification, profile lookup, linking or a repeat discount', async (purpose) => {
    mocks.readVerifiedEmailSession.mockReturnValue(null)
    mocks.resolveRepeatBookingDecision.mockResolvedValue({ customer: { id: 'private-customer' }, kind: 'closed' })
    expect((await createPendingAppointment({ ...input, purpose })).success).toBe(true)
    expect(mocks.readVerifiedEmailSession).not.toHaveBeenCalled()
    expect(mocks.resolveRepeatBookingDecision).not.toHaveBeenCalled()
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create.mock.calls[0][0]).toEqual(expect.objectContaining({ collection: 'appointments' }))
    expect(mocks.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ fittingFee: 20, status: 'pending_payment' }))
    expect(mocks.create.mock.calls[0][0].data).not.toHaveProperty('customer')
    mocks.getPayload.mockClear()
    expect(await getBookingFeeQuote({ ...input, purpose })).toEqual({ amount: 20, kind: 'standard', success: true })
    expect(mocks.getPayload).not.toHaveBeenCalled()
    expect(mocks.resolveRepeatBookingDecision).not.toHaveBeenCalled()
  })

  it('persists an eligible follow-up as confirmed and unpaid at zero', async () => {
    mocks.resolveRepeatBookingDecision.mockResolvedValue({ customer: { id: 'customer-1' }, kind: 'free' })
    expect((await createPendingAppointment({ ...input, purpose: 'follow_up' })).success).toBe(true)
    expect(mocks.create.mock.calls[0]?.[0].data).toEqual(expect.objectContaining({
      purpose: 'follow_up', fittingFee: 0, status: 'confirmed', paymentStatus: 'unpaid',
    }))
  })

  it('keeps eligibility private until verified and refuses a paid follow-up quote', async () => {
    mocks.readVerifiedEmailSession.mockReturnValue(null)
    expect((await checkFollowUpEligibility({ email: input.email })).success).toBe(false)
    expect(mocks.resolveRepeatBookingDecision).not.toHaveBeenCalled()
    mocks.readVerifiedEmailSession.mockReturnValue('bride@example.com')
    mocks.resolveRepeatBookingDecision.mockResolvedValue({ customer: { id: 'customer-1' }, kind: 'standard' })
    expect((await checkFollowUpEligibility({ email: input.email })).success).toBe(false)
    expect((await getBookingFeeQuote({ ...input, purpose: 'follow_up' })).success).toBe(false)
    mocks.resolveRepeatBookingDecision.mockResolvedValue({ customer: { id: 'customer-1' }, kind: 'free' })
    expect((await checkFollowUpEligibility({ email: input.email })).success).toBe(true)
    expect(await getBookingFeeQuote({ ...input, purpose: 'follow_up' })).toEqual({ success: true, amount: 0, kind: 'repeat' })
  })

  it('rechecks follow-up entitlement in the Payload hook even if the caller supplies the standard fee', async () => {
    mocks.resolveRepeatBookingDecision.mockResolvedValue({ customer: { id: 'customer-1' }, kind: 'standard' })
    const args = {
      data: { customer: 'customer-1', email: input.email, fittingFee: 20, purpose: 'follow_up', source: 'website', startAt: '2099-01-02T10:00:00Z' },
      operation: 'create',
      req: { payload: { findByID: async () => ({ email: input.email }) } },
    } as unknown as Parameters<typeof validateAppointmentCustomer>[0]
    await expect(validateAppointmentCustomer(args)).rejects.toThrow(/free follow-up/)
  })

  it('rejects attaching a private profile to a guest booking at the write boundary', async () => {
    await expect(validateAppointmentCustomer({
      data: { source: 'website', purpose: 'buy', fittingFee: 20, customer: 'private-profile' },
      operation: 'create',
    } as never)).rejects.toThrow(/guest bookings cannot attach/i)
    expect(mocks.resolveRepeatBookingDecision).not.toHaveBeenCalled()
  })

  it('rejects a forged guest discount at the write boundary', async () => {
    await expect(validateAppointmentCustomer({
      data: { source: 'website', purpose: 'rent', fittingFee: 0 }, operation: 'create',
    } as never)).rejects.toThrow(/fitting fee changed/i)
    expect(mocks.resolveRepeatBookingDecision).not.toHaveBeenCalled()
  })
})
