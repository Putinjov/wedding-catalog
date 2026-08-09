import type { Appointment } from '@/payload-types'
import {
  MAXIMUM_BOOKING_HOLD_MINUTES,
  STRIPE_CHECKOUT_MINIMUM_HOLD_MINUTES,
} from '@/config/booking'

const millisecondsPerSecond = 1_000
const secondsPerMinute = 60

export type AppointmentHoldExpiry = {
  iso: string
  unixSeconds: number
}

export function createAppointmentHoldExpiry(
  holdMinutes: number,
  now: Date = new Date(),
): AppointmentHoldExpiry {
  if (
    !Number.isInteger(holdMinutes) ||
    holdMinutes < STRIPE_CHECKOUT_MINIMUM_HOLD_MINUTES ||
    holdMinutes > MAXIMUM_BOOKING_HOLD_MINUTES
  ) {
    throw new Error(
      `holdMinutes must be an integer from ${STRIPE_CHECKOUT_MINIMUM_HOLD_MINUTES} to ${MAXIMUM_BOOKING_HOLD_MINUTES}.`,
    )
  }

  const nowMilliseconds = now.getTime()
  if (Number.isNaN(nowMilliseconds)) {
    throw new Error('A valid current time is required to create a booking hold.')
  }

  const unixSeconds =
    Math.floor(nowMilliseconds / millisecondsPerSecond) + holdMinutes * secondsPerMinute

  return {
    iso: new Date(unixSeconds * millisecondsPerSecond).toISOString(),
    unixSeconds,
  }
}

export function getExpiryTime(value: null | string | undefined): number | null {
  if (!value) return null

  const expiry = new Date(value).getTime()
  return Number.isNaN(expiry) ? null : expiry
}

export function isAppointmentHoldActive(
  appointment: Pick<Appointment, 'holdExpiresAt'>,
  now: Date = new Date(),
): boolean {
  const expiry = getExpiryTime(appointment.holdExpiresAt)
  return expiry !== null && expiry > now.getTime()
}
