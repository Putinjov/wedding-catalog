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
vi.mock('@/lib/customers/repeatBooking', () => ({
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
    const result = await createPendingAppointment(input)
    expect(result.success).toBe(false)
    expect(mocks.getPayload).not.toHaveBeenCalled()
    expect(mocks.resolveRepeatBookingDecision).not.toHaveBeenCalled()
  })

  it('confirms a free linked repeat visit without creating a Stripe hold', async () => {
    mocks.resolveRepeatBookingDecision.mockResolvedValue({
      customer: { id: 'customer-1' }, kind: 'free',
    })
    const result = await createPendingAppointment(input)
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
    const result = await createPendingAppointment(input)
    expect(result).toEqual(expect.objectContaining({ success: false }))
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
