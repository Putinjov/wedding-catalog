import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import FittingPaymentSuccessPage from '@/app/(frontend)/book-a-fitting/payment/success/page'
import { defaultBookingSettings } from '@/config/booking'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
import { getBookingSettings } from '@/lib/booking/settings'
import { getFittingCheckoutSession } from '@/lib/stripe/getFittingCheckoutSession'
import type { Appointment } from '@/payload-types'

vi.mock('@/components/booking/payment-status-poller', () => ({
  PaymentStatusPoller: () => <p role="status">Synthetic automatic status check</p>,
}))
vi.mock('@/lib/booking/getAppointment', () => ({ getAppointmentByReference: vi.fn() }))
vi.mock('@/lib/booking/settings', () => ({ getBookingSettings: vi.fn() }))
vi.mock('@/lib/stripe/getFittingCheckoutSession', () => ({
  getFittingCheckoutSession: vi.fn(),
}))

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    amountPaid: 2000,
    createdAt: '2026-01-01T00:00:00.000Z',
    customerName: 'Private Customer',
    email: 'private@example.com',
    endAt: '2026-10-27T11:00:00.000Z',
    fittingFee: 20,
    id: 'appointment-1',
    needsAdminReview: false,
    paymentStatus: 'paid',
    phone: '+353000000000',
    publicReference: `fit_${'c'.repeat(32)}`,
    purpose: 'undecided',
    source: 'website',
    startAt: '2026-10-27T10:00:00.000Z',
    status: 'confirmed',
    stripeCheckoutSessionId: 'cs_test_verified',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('booking success page', () => {
  beforeEach(() => {
    vi.mocked(getAppointmentByReference).mockReset()
    vi.mocked(getBookingSettings).mockReset()
    vi.mocked(getFittingCheckoutSession).mockReset()
    vi.mocked(getAppointmentByReference).mockResolvedValue(appointment())
    vi.mocked(getFittingCheckoutSession).mockResolvedValue({
      amount_total: 2000,
      id: 'cs_test_verified',
      payment_status: 'paid',
      status: 'complete',
    } as never)
    vi.mocked(getBookingSettings).mockResolvedValue({
      ...defaultBookingSettings,
      visitDetails: {
        address: 'Verified boutique address',
        arrivalInstructions: 'Use the accessible front entrance.',
        mapUrl: 'https://maps.example.test/verified',
        whatToBring: ['Shoes you may wear'],
      },
    })
  })

  it('shows verified visit details, reference, contact and calendar action after confirmation', async () => {
    const page = await FittingPaymentSuccessPage({
      searchParams: Promise.resolve({
        reference: `fit_${'c'.repeat(32)}`,
        session_id: 'cs_test_verified',
      }),
    })
    const markup = renderToStaticMarkup(page)

    expect(markup).toContain('Your fitting is confirmed')
    expect(markup).toContain(`fit_${'c'.repeat(32)}`)
    expect(markup).toContain('Verified boutique address')
    expect(markup).toContain('Use the accessible front entrance.')
    expect(markup).toContain('Shoes you may wear')
    expect(markup).toContain('Add to calendar')
    expect(markup).toContain('bookings@caitbridal.ie')
    expect(markup).not.toContain('private@example.com')
    expect(markup).not.toContain('+353000000000')
  })

  it('renders the automatic status poller while the backend is still processing', async () => {
    vi.mocked(getAppointmentByReference).mockResolvedValue(
      appointment({
        amountPaid: null,
        holdExpiresAt: '2099-01-01T11:00:00.000Z',
        paymentStatus: 'processing',
        status: 'payment_processing',
      }),
    )

    const page = await FittingPaymentSuccessPage({
      searchParams: Promise.resolve({
        reference: `fit_${'c'.repeat(32)}`,
        session_id: 'cs_test_verified',
      }),
    })
    const markup = renderToStaticMarkup(page)

    expect(markup).toContain('Your payment is being processed')
    expect(markup).toContain('Synthetic automatic status check')
    expect(markup).not.toContain('Plan your visit')
  })
})
