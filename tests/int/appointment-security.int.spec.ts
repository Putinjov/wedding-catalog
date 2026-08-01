import { describe, expect, it } from 'vitest'

import { isAppointmentBlockingSlot } from '@/lib/booking/appointmentConflicts'
import {
  appointmentPaymentContext,
  assertProtectedAppointmentFields,
} from '@/lib/booking/paymentIntegrity'
import type { Appointment } from '@/payload-types'

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appointment-id',
    publicReference: 'fit_0123456789abcdef0123456789abcdef',
    purpose: 'buy',
    customerName: 'Customer',
    email: 'customer@example.com',
    phone: '+353100000000',
    startAt: '2030-01-01T10:00:00.000Z',
    endAt: '2030-01-01T11:00:00.000Z',
    status: 'pending',
    paymentStatus: 'unpaid',
    fittingFee: 50,
    currency: 'EUR',
    source: 'website',
    updatedAt: '2030-01-01T09:00:00.000Z',
    createdAt: '2030-01-01T09:00:00.000Z',
    ...overrides,
  }
}

describe('appointment payment integrity', () => {
  it('rejects a direct paid update', () => {
    expect(() =>
      assertProtectedAppointmentFields({
        data: { paymentStatus: 'paid', status: 'confirmed' },
        operation: 'update',
        originalDoc: appointment(),
      }),
    ).toThrow(/server-controlled/i)
  })

  it('allows a Stripe webhook to mark an appointment paid', () => {
    expect(() =>
      assertProtectedAppointmentFields({
        context: appointmentPaymentContext('stripe-webhook', 'checkout.session.completed'),
        data: { paymentStatus: 'paid' },
        operation: 'update',
        originalDoc: appointment(),
      }),
    ).not.toThrow()
  })

  it('never allows a paid appointment to be downgraded', () => {
    expect(() =>
      assertProtectedAppointmentFields({
        context: appointmentPaymentContext('stripe-webhook', 'checkout.session.expired'),
        data: { paymentStatus: 'unpaid' },
        operation: 'update',
        originalDoc: appointment({ paymentStatus: 'paid' }),
      }),
    ).toThrow(/cannot be downgraded/i)
  })

  it('ignores expired unpaid website holds but keeps paid appointments blocking', () => {
    const expired = appointment({ holdExpiresAt: '2029-12-31T09:00:00.000Z' })
    expect(isAppointmentBlockingSlot(expired, new Date('2030-01-01T09:00:00.000Z'))).toBe(false)
    expect(
      isAppointmentBlockingSlot(
        { ...expired, paymentStatus: 'paid' },
        new Date('2030-01-01T09:00:00.000Z'),
      ),
    ).toBe(true)
  })
})
