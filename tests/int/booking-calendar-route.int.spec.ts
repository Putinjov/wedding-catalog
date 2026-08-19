import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/(frontend)/book-a-fitting/calendar/[reference]/route'
import { defaultBookingSettings } from '@/config/booking'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
import { getBookingSettings } from '@/lib/booking/settings'
import type { Appointment } from '@/payload-types'

vi.mock('@/lib/booking/getAppointment', () => ({ getAppointmentByReference: vi.fn() }))
vi.mock('@/lib/booking/settings', () => ({ getBookingSettings: vi.fn() }))

const confirmedAppointment = {
  createdAt: '2026-01-01T00:00:00.000Z',
  customerName: 'Private Customer',
  email: 'private@example.com',
  endAt: '2026-10-27T11:00:00.000Z',
  fittingFee: 20,
  id: 'appointment-1',
  needsAdminReview: false,
  paymentStatus: 'paid',
  phone: '+353000000000',
  publicReference: `fit_${'b'.repeat(32)}`,
  purpose: 'rent',
  source: 'website',
  startAt: '2026-10-27T10:00:00.000Z',
  status: 'confirmed',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as Appointment

describe('private booking calendar route', () => {
  beforeEach(() => {
    vi.mocked(getAppointmentByReference).mockReset()
    vi.mocked(getBookingSettings).mockReset()
    vi.mocked(getBookingSettings).mockResolvedValue(defaultBookingSettings)
  })

  it('returns a private no-store attachment only for a paid confirmed appointment', async () => {
    vi.mocked(getAppointmentByReference).mockResolvedValue(confirmedAppointment)

    const response = await GET(new Request('https://example.test'), {
      params: Promise.resolve({ reference: confirmedAppointment.publicReference }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    expect(response.headers.get('content-disposition')).toContain('attachment')
    expect(await response.text()).toContain('DTSTART:20261027T100000Z')
  })

  it('fails closed without loading visit details for an unconfirmed appointment', async () => {
    vi.mocked(getAppointmentByReference).mockResolvedValue({
      ...confirmedAppointment,
      paymentStatus: 'processing',
      status: 'payment_processing',
    })

    const response = await GET(new Request('https://example.test'), {
      params: Promise.resolve({ reference: confirmedAppointment.publicReference }),
    })

    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(getBookingSettings).not.toHaveBeenCalled()
  })
})
