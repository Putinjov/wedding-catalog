import { describe, expect, it } from 'vitest'
import { assessAppointmentRetention } from '@/lib/privacy/assessAppointmentRetention'
import type { Appointment } from '@/payload-types'

const now = new Date('2030-06-01T12:00:00Z')
const old = '2030-04-01T12:00:00Z'
const appointment = {
  id: '1', status: 'cancelled', paymentStatus: 'unpaid', cancelledAt: old, updatedAt: old,
  customerName: 'Test', email: 'test@example.test', phone: '123456', needsAdminReview: false,
} as Appointment

describe('retention eligibility', () => {
  it('requires 30 days since cancellation and handles legacy dates conservatively', () => {
    expect(assessAppointmentRetention({ appointment, now }).eligible).toBe(true)
    expect(assessAppointmentRetention({ appointment: { ...appointment, cancelledAt: null, updatedAt: now.toISOString() }, now }).eligible).toBe(false)
    expect(assessAppointmentRetention({ appointment: { ...appointment, cancelledAt: '2030-05-03T12:00:01Z' }, now }).eligible).toBe(false)
  })
  it('protects payment and dispute evidence including failed or abandoned Stripe sessions', () => {
    for (const fields of [{ stripeCheckoutSessionId: 'cs' }, { stripePaymentIntentId: 'pi' }, { amountPaid: 0 }, { paymentStatus: 'refunded' as const }, { needsAdminReview: true }, { retentionHold: true }]) {
      expect(assessAppointmentRetention({ appointment: { ...appointment, ...fields }, now }).eligible).toBe(false)
    }
  })
  it('protects marketing and linked profiles', () => {
    expect(assessAppointmentRetention({ appointment: { ...appointment, marketingConsentStatus: 'granted' }, now }).eligible).toBe(false)
    expect(assessAppointmentRetention({ appointment: { ...appointment, customer: 'profile' }, now }).eligible).toBe(false)
  })
})
