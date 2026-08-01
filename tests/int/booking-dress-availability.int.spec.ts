import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPendingAppointment } from '@/lib/booking/createAppointment'
import { defaultBookingSettings } from '@/config/booking'

const mocks = vi.hoisted(() => ({
  getAvailableDressBySlug: vi.fn(),
  getPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({
  default: Promise.resolve({}),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()

  return {
    ...actual,
    getPayload: mocks.getPayload,
  }
})

vi.mock('@/lib/getDress', () => ({
  getAvailableDressBySlug: mocks.getAvailableDressBySlug,
}))

vi.mock('@/lib/booking/settings', () => ({
  getBookingSettings: vi.fn(async () => defaultBookingSettings),
}))

vi.mock('@/lib/booking/date', () => ({
  getBookingScheduleLabel: vi.fn(() => 'Choose an open date.'),
  getBookingWindowLabel: vi.fn(() => 'Choose a date in the booking window.'),
  getSlotDateTimes: vi.fn(() => ({
    endAt: new Date('2099-01-02T11:00:00.000Z'),
    startAt: new Date('2099-01-02T10:00:00.000Z'),
  })),
  isClosedDate: vi.fn(() => false),
  isDateWithinBookingWindow: vi.fn(() => true),
  isValidSlotTime: vi.fn(() => true),
}))

vi.mock('@/lib/security/rateLimit', () => ({
  consumeRateLimits: vi.fn(() => true),
  identifierRateLimitRule: vi.fn(() => ({ key: 'identifier' })),
  ipRateLimitRule: vi.fn(() => ({ key: 'ip' })),
}))

describe('public booking dress availability', () => {
  beforeEach(() => {
    mocks.getAvailableDressBySlug.mockReset()
    mocks.getPayload.mockReset()
  })

  it('revalidates the selected dress with the requested mode before creating an appointment', async () => {
    mocks.getAvailableDressBySlug.mockResolvedValue(null)

    const result = await createPendingAppointment({
      customerName: 'Test Customer',
      date: '2099-01-02',
      dressSlug: 'grace',
      email: 'test@example.com',
      phone: '+3530000000',
      purpose: 'rent',
      time: '10:00',
    })

    expect(mocks.getAvailableDressBySlug).toHaveBeenCalledWith('grace', 'rent')
    expect(mocks.getPayload).not.toHaveBeenCalled()
    expect(result).toEqual({
      fieldErrors: {
        dressSlug: 'Please remove this dress or choose another option.',
        purpose: 'This dress is not available for that purpose.',
      },
      message: 'That dress is no longer available for the selected purpose.',
      success: false,
    })
  })
})
