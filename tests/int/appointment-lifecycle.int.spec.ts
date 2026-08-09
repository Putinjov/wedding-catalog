import { describe, expect, it } from 'vitest'

import {
  appointmentLifecycleTransitions,
  appointmentPaymentStatusValues,
  appointmentStatusValues,
  assertAppointmentLifecycleState,
  assertAppointmentLifecycleTransition,
  isAppointmentLifecycleStateValid,
  isAppointmentLifecycleTransitionAllowed,
  validAppointmentLifecycleStates,
} from '@/lib/booking/appointmentLifecycle'

describe('appointment lifecycle state machine', () => {
  it.each(validAppointmentLifecycleStates)(
    'accepts the valid $status and $paymentStatus state pair',
    (lifecycle) => {
      expect(() => assertAppointmentLifecycleState(lifecycle)).not.toThrow()
    },
  )

  it('rejects every unlisted appointment and payment state pair', () => {
    for (const status of appointmentStatusValues) {
      for (const paymentStatus of appointmentPaymentStatusValues) {
        const lifecycle = { paymentStatus, status }
        if (isAppointmentLifecycleStateValid(lifecycle)) continue
        expect(() => assertAppointmentLifecycleState(lifecycle)).toThrow('is not compatible')
      }
    }
  })

  it.each(appointmentLifecycleTransitions)(
    'allows $from.status:$from.paymentStatus to transition to $to.status:$to.paymentStatus',
    ({ from, to }) => {
      expect(() => assertAppointmentLifecycleTransition(from, to)).not.toThrow()
    },
  )

  it('allows idempotent writes and rejects every unlisted transition', () => {
    for (const from of validAppointmentLifecycleStates) {
      for (const to of validAppointmentLifecycleStates) {
        if (isAppointmentLifecycleTransitionAllowed(from, to)) {
          expect(() => assertAppointmentLifecycleTransition(from, to)).not.toThrow()
        } else {
          expect(() => assertAppointmentLifecycleTransition(from, to)).toThrow('is not allowed')
        }
      }
    }
  })
})
