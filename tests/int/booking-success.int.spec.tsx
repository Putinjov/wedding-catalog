import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PaymentStatusPoller } from '@/components/booking/payment-status-poller'
import { defaultBookingSettings } from '@/config/booking'
import { buildAppointmentCalendar } from '@/lib/booking/appointmentCalendar'
import { getBookingSuccessState } from '@/lib/booking/bookingSuccess'
import type { Appointment } from '@/payload-types'

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    customerName: 'Private Customer',
    email: 'private@example.com',
    endAt: '2026-03-31T10:00:00.000Z',
    fittingFee: 20,
    holdExpiresAt: '2026-03-31T09:30:00.000Z',
    id: 'appointment-1',
    needsAdminReview: false,
    notes: 'Private notes',
    paymentStatus: 'processing',
    phone: '+353000000000',
    publicReference: `fit_${'a'.repeat(32)}`,
    purpose: 'buy',
    source: 'website',
    startAt: '2026-03-31T09:00:00.000Z',
    status: 'payment_processing',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('booking success state', () => {
  const verifiedCheckout = {
    belongsToAppointment: true,
    paymentStatus: 'paid',
    status: 'complete',
  }

  it('uses authoritative appointment lifecycle states after checkout ownership is verified', () => {
    expect(
      getBookingSuccessState({
        appointment: appointment({ paymentStatus: 'paid', status: 'confirmed' }),
        checkout: verifiedCheckout,
      }),
    ).toBe('confirmed')
    expect(
      getBookingSuccessState({
        appointment: appointment({ paymentStatus: 'paid', status: 'payment_received_conflict' }),
        checkout: verifiedCheckout,
      }),
    ).toBe('conflict')
    expect(
      getBookingSuccessState({
        appointment: appointment({ paymentStatus: 'failed', status: 'payment_failed' }),
        checkout: { ...verifiedCheckout, paymentStatus: 'unpaid', status: 'open' },
        now: new Date('2026-03-31T09:29:59.999Z'),
      }),
    ).toBe('failed')
  })

  it('distinguishes active processing from an expired backend hold', () => {
    const current = appointment()
    expect(
      getBookingSuccessState({
        appointment: current,
        checkout: verifiedCheckout,
        now: new Date('2026-03-31T09:29:59.999Z'),
      }),
    ).toBe('processing')
    expect(
      getBookingSuccessState({
        appointment: current,
        checkout: verifiedCheckout,
        now: new Date('2026-03-31T09:30:00.000Z'),
      }),
    ).toBe('expired')
  })

  it('never trusts a checkout session that does not belong to the appointment', () => {
    expect(
      getBookingSuccessState({
        appointment: appointment({ paymentStatus: 'paid', status: 'confirmed' }),
        checkout: { belongsToAppointment: false },
      }),
    ).toBe('failed')
  })
})

describe('appointment calendar export', () => {
  it('uses UTC instants across Dublin DST and excludes customer contact data', () => {
    const calendar = buildAppointmentCalendar({
      appointment: appointment({ paymentStatus: 'paid', status: 'confirmed' }),
      generatedAt: new Date('2026-03-01T12:00:00.000Z'),
      visitDetails: {
        address: 'Verified fitting address',
        arrivalInstructions: 'Please arrive five minutes early.',
        mapUrl: 'https://maps.example.test/verified',
        whatToBring: ['Shoes you may wear'],
      },
    })

    expect(calendar).toContain('DTSTART:20260331T090000Z')
    expect(calendar).toContain('DTEND:20260331T100000Z')
    expect(calendar).toContain('LOCATION:Verified fitting address')
    expect(calendar).toContain('Please arrive five minutes early.')
    expect(calendar).not.toContain('private@example.com')
    expect(calendar).not.toContain('+353000000000')
    expect(calendar).not.toContain('Private notes')
    expect(calendar.split('\r\n').at(-1)).toBe('')
  })

  it('omits an unverified location instead of inventing one', () => {
    const calendar = buildAppointmentCalendar({
      appointment: appointment({ paymentStatus: 'paid', status: 'confirmed' }),
      visitDetails: defaultBookingSettings.visitDetails,
    })

    expect(calendar).not.toContain('LOCATION:')
    expect(calendar).not.toContain('Tullamore')
  })
})

describe('payment status polling', () => {
  afterEach(() => {
    mocks.refresh.mockReset()
    vi.useRealTimers()
  })

  it('refreshes server state automatically and stops after the bounded attempt count', async () => {
    vi.useFakeTimers()
    render(<PaymentStatusPoller intervalMs={1_000} maxAttempts={1} />)

    expect(screen.getByRole('status').textContent).toMatch(/checks.*automatically/i)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toMatch(/taking longer than expected/i)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})
