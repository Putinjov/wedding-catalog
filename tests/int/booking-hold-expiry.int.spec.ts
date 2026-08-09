import type Stripe from 'stripe'
import { describe, expect, it } from 'vitest'

import {
  createAppointmentHoldExpiry,
  isAppointmentHoldActive,
} from '@/lib/booking/appointmentHold'
import { isAppointmentBlockingSlot } from '@/lib/booking/appointmentConflicts'
import { isMatchingFittingCheckoutExpiry } from '@/lib/stripe/fitting'

describe('booking hold expiry', () => {
  const now = new Date('2030-01-01T10:00:00.999Z')
  const expiry = createAppointmentHoldExpiry(30, now)

  it('creates one second-aligned expiry for Payload and Stripe', () => {
    expect(expiry).toEqual({
      iso: '2030-01-01T10:30:00.000Z',
      unixSeconds: 1_893_493_800,
    })
  })

  it('treats one millisecond before expiry as active and the exact boundary as released', () => {
    const appointment = { holdExpiresAt: expiry.iso }

    expect(isAppointmentHoldActive(appointment, new Date('2030-01-01T10:29:59.999Z'))).toBe(true)
    expect(isAppointmentHoldActive(appointment, new Date('2030-01-01T10:30:00.000Z'))).toBe(false)
    expect(isAppointmentHoldActive(appointment, new Date('2030-01-01T10:30:00.001Z'))).toBe(false)
  })

  it('releases a website payment-processing slot at the same boundary', () => {
    const appointment = {
      holdExpiresAt: expiry.iso,
      paymentStatus: 'processing' as const,
      source: 'website' as const,
      status: 'payment_processing' as const,
    }

    expect(isAppointmentBlockingSlot(appointment, new Date('2030-01-01T10:29:59.999Z'))).toBe(true)
    expect(isAppointmentBlockingSlot(appointment, new Date('2030-01-01T10:30:00.000Z'))).toBe(false)
  })

  it('requires Stripe, Checkout, and slot hold expiry to match exactly', () => {
    const session = { expires_at: expiry.unixSeconds } as Stripe.Checkout.Session
    const appointment = {
      checkoutExpiresAt: expiry.iso,
      holdExpiresAt: expiry.iso,
    }

    expect(isMatchingFittingCheckoutExpiry(session, appointment)).toBe(true)
    expect(
      isMatchingFittingCheckoutExpiry(session, {
        ...appointment,
        checkoutExpiresAt: '2030-01-01T10:31:00.000Z',
      }),
    ).toBe(false)
  })
})
