import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CalendarEmptyState } from '@/components/admin/appointments-calendar/calendar-empty-state'
import { getVisibleRange } from '@/lib/admin/appointments/calendarDate'
import { toCalendarAppointment } from '@/lib/admin/appointments/calendarTypes'
import type { Appointment } from '@/payload-types'

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appointment-1',
    publicReference: 'SAFE-REFERENCE',
    purpose: 'buy',
    customerName: 'Test Customer',
    email: 'customer@example.com',
    phone: '0870000000',
    startAt: '2026-07-21T09:00:00.000Z',
    endAt: '2026-07-21T10:00:00.000Z',
    status: 'confirmed',
    paymentStatus: 'paid',
    fittingFee: 20,
    currency: 'EUR',
    source: 'website',
    needsAdminReview: false,
    updatedAt: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('appointments calendar', () => {
  it('maps a Payload appointment into a safe overview event', () => {
    const event = toCalendarAppointment(appointment())

    expect(event).toMatchObject({
      customerName: 'Test Customer',
      paymentStatus: 'paid',
      purpose: 'buy',
      status: 'confirmed',
    })
    expect(event).not.toHaveProperty('email')
    expect(event).not.toHaveProperty('phone')
  })

  it('rejects invalid event dates before they reach the calendar grid', () => {
    expect(() => toCalendarAppointment(appointment({ startAt: 'not-a-date' }))).toThrow(
      'invalid calendar dates',
    )
  })

  it('builds a six-week Dublin-safe range for month view', () => {
    const range = getVisibleRange('2026-07-18', 'month')

    expect(range.keys).toHaveLength(42)
    expect(range.from).toBe('2026-06-28T23:00:00.000Z')
    expect(range.to).toBe('2026-08-09T23:00:00.000Z')
  })

  it('renders an explicit empty calendar state', () => {
    const markup = renderToStaticMarkup(<CalendarEmptyState />)

    expect(markup).toContain('No appointments match')
    expect(markup).toContain('role="status"')
  })
})
