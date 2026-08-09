import { describe, expect, it } from 'vitest'

import {
  getAppointmentEmailEvents,
  shouldDeliverAppointmentEmail,
} from '@/lib/notifications/appointmentEmailEvents'

function state(
  overrides: Partial<{
    endAt: string
    needsAdminReview: boolean
    paymentStatus: 'failed' | 'paid' | 'partially_refunded' | 'processing' | 'refunded' | 'unpaid'
    refundStatus: 'canceled' | 'failed' | 'pending' | 'requires_action' | 'succeeded' | null
    startAt: string
    status:
      | 'cancelled'
      | 'completed'
      | 'confirmed'
      | 'expired'
      | 'no_show'
      | 'partially_refunded'
      | 'payment_failed'
      | 'payment_processing'
      | 'payment_received_conflict'
      | 'pending_payment'
      | 'refunded'
  }> = {},
) {
  return {
    endAt: '2030-06-01T11:00:00.000Z',
    needsAdminReview: false,
    paymentStatus: 'unpaid' as const,
    refundStatus: null,
    startAt: '2030-06-01T10:00:00.000Z',
    status: 'pending_payment' as const,
    ...overrides,
  }
}

describe('appointment email event mapping', () => {
  it('queues one pending event when a booking is created', () => {
    expect(
      getAppointmentEmailEvents({ appointment: state(), operation: 'create' }),
    ).toEqual(['pending'])
  })

  it('does not turn a paid conflict into a customer confirmation', () => {
    expect(
      getAppointmentEmailEvents({
        appointment: state({
          needsAdminReview: true,
          paymentStatus: 'paid',
          status: 'payment_received_conflict',
        }),
        operation: 'update',
        previous: state({ paymentStatus: 'processing', status: 'payment_processing' }),
      }),
    ).toEqual(['admin_alert'])
  })

  it('maps a schedule change and confirmation to one rescheduled customer email', () => {
    expect(
      getAppointmentEmailEvents({
        appointment: state({
          paymentStatus: 'paid',
          startAt: '2030-06-02T12:00:00.000Z',
          status: 'confirmed',
        }),
        operation: 'update',
        previous: state({
          needsAdminReview: true,
          paymentStatus: 'paid',
          status: 'payment_received_conflict',
        }),
      }),
    ).toEqual(['rescheduled'])
  })

  it('gives refund messaging precedence over terminal status changes', () => {
    expect(
      getAppointmentEmailEvents({
        appointment: state({ paymentStatus: 'refunded', status: 'refunded' }),
        operation: 'update',
        previous: state({ paymentStatus: 'paid', status: 'cancelled' }),
      }),
    ).toEqual(['refund'])
  })

  it('does not queue anything for an idempotent lifecycle write', () => {
    const appointment = state({ paymentStatus: 'paid', status: 'confirmed' })
    expect(
      getAppointmentEmailEvents({ appointment, operation: 'update', previous: appointment }),
    ).toEqual([])
  })

  it('skips obsolete queued events after the authoritative state changes', () => {
    expect(
      shouldDeliverAppointmentEmail(
        'pending',
        state({ paymentStatus: 'paid', status: 'confirmed' }),
      ),
    ).toBe(false)
    expect(
      shouldDeliverAppointmentEmail(
        'confirmed',
        state({ paymentStatus: 'paid', status: 'confirmed' }),
      ),
    ).toBe(true)
  })
})
