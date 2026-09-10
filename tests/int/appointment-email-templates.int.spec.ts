import { describe, expect, it } from 'vitest'

import { buildAppointmentEmail } from '@/lib/notifications/appointmentEmailTemplates'
import type { AppointmentEmailEvent } from '@/lib/notifications/types'
import type { Appointment } from '@/payload-types'

const appointment = {
  id: 'synthetic-appointment',
  email: 'customer@example.com',
  customerName: '<script>private name</script>',
  phone: 'private-phone',
  notes: 'private-notes',
  publicReference: 'fit_private_reference',
  startAt: '2030-06-10T09:00:00.000Z',
  endAt: '2030-06-10T10:30:00.000Z',
  purpose: 'buy',
  fittingFee: 0,
  paymentStatus: 'unpaid',
  status: 'confirmed',
} as Appointment

function message(event: AppointmentEmailEvent = 'confirmed', overrides: Partial<Appointment> = {}) {
  return buildAppointmentEmail({
    adminAddress: 'admin@example.com',
    appointment: { ...appointment, ...overrides },
    event,
    replyToAddress: 'bookings@caitbridal.ie',
  })
}

describe('customer appointment email presentation', () => {
  it.each([
    'pending',
    'confirmed',
    'failed',
    'expired',
    'rescheduled',
    'cancelled',
    'refund',
  ] as const)('omits visible references and unnecessary customer data for %s', (event) => {
    const result = message(event)
    const doc = new DOMParser().parseFromString(result.html!, 'text/html')
    expect(doc.body.textContent).not.toContain(appointment.publicReference)
    expect(result.text).not.toContain('Reference:')
    for (const privateValue of [appointment.phone, appointment.notes, appointment.customerName]) {
      expect(result.html).not.toContain(privateValue)
      expect(result.text).not.toContain(privateValue)
    }
    expect(result.text).toContain('R42 YX50')
    expect(doc.body.textContent).toContain('R42 YX50')
    expect(doc.querySelector('html')?.lang).toBe('en')
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('a[href="mailto:bookings@caitbridal.ie"]')).not.toBeNull()
    if (event === 'pending' || event === 'failed') {
      expect(doc.querySelector('a[href*="/pending/"]')?.getAttribute('href')).toContain(
        appointment.publicReference,
      )
    } else {
      expect(result.text).not.toContain(appointment.publicReference)
      expect(result.html).not.toContain(appointment.publicReference)
    }
  })

  it('uses stored duration and Dublin summer/winter times', () => {
    expect(message().text).toContain('10:00')
    expect(message().text).toContain('Duration: 90 minutes')
    expect(message().text).toContain('Europe/Dublin')
    const winter = message('confirmed', {
      startAt: '2030-12-10T09:00:00.000Z',
      endAt: '2030-12-10T10:00:00.000Z',
    })
    expect(winter.text).toContain('09:00')
    expect(winter.text).toContain('Duration: 60 minutes')
  })

  it.each([
    ['2030-03-31T00:30:00Z', '2030-03-31T02:00:00Z', '00:30'],
    ['2030-10-27T00:30:00Z', '2030-10-27T02:00:00Z', '01:30'],
  ])('preserves elapsed duration across DST at %s', (startAt, endAt, time) => {
    const result = message('confirmed', { startAt, endAt })
    expect(result.text).toContain(time)
    expect(result.text).toContain('90 minutes')
  })

  it('distinguishes waived, paid and unpaid fitting fees', () => {
    expect(message().text).toContain('Free — welcome offer (€0)')
    expect(message().text).not.toContain('— paid')
    expect(message('confirmed', { fittingFee: 20, paymentStatus: 'paid' }).text).toContain(
      '€20.00 — paid',
    )
    const unpaid = message('confirmed', { fittingFee: 20 })
    expect(unpaid.text).not.toContain('— paid')
    expect(unpaid.text).not.toContain('verified')
  })

  it('shows only the recorded refund amount without promising a cancellation refund', () => {
    expect(message('refund', { refundAmount: 1000 }).text).toContain('Refund amount: €10.00')
    expect(message('refund').text).not.toContain('Refund amount:')
    expect(message('cancelled').text).toContain('does not state that any payment has been refunded')
  })

  it('escapes dynamic HTML without changing the text fallback', () => {
    const result = message('confirmed', { startAt: '<img src=x onerror=alert(1)>' })
    expect(result.html).toContain('&lt;img')
    const doc = new DOMParser().parseFromString(result.html!, 'text/html')
    expect(doc.querySelector('img')).toBeNull()
    expect(result.text).not.toContain('Duration:')
  })
})
