'use server'

import configPromise from '@payload-config'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import { z } from 'zod'

import { siteConfig } from '@/config/site'
import { getSlotDateTimes, isValidSlotTime } from '@/lib/booking/date'
import { getBookingSettings } from '@/lib/booking/settings'
import { normalizeCustomerEmail } from '@/lib/customers/email'
import { readVerifiedEmailSession, verifiedEmailCookieName } from '@/lib/customers/emailVerification'
import { resolveRepeatBookingDecision } from '@/lib/customers/repeatBooking'
import { consumeRateLimits, ipRateLimitRule } from '@/lib/security/rateLimit'
import { getServerEnvironment } from '@/config/env'

const quoteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  email: z.email().max(254),
  time: z.string().regex(/^\d{2}:\d{2}$/),
})

export type BookingFeeQuote =
  | { amount: number; kind: 'repeat' | 'standard' | 'welcome'; success: true }
  | { message: string; success: false }

export async function getBookingFeeQuote(input: unknown): Promise<BookingFeeQuote> {
  const parsed = quoteSchema.safeParse(input)
  if (!parsed.success) return { message: 'Choose a valid fitting time and email.', success: false }
  const { date, time } = parsed.data
  const email = normalizeCustomerEmail(parsed.data.email)
  const secret = getServerEnvironment({ strict: false }).PAYLOAD_SECRET
  const cookieStore = await cookies()
  if (!secret || readVerifiedEmailSession(cookieStore.get(verifiedEmailCookieName)?.value, secret) !== email) {
    return { message: 'Please verify this email address before booking.', success: false }
  }
  const requestHeaders = await headers()
  if (!consumeRateLimits([ipRateLimitRule(requestHeaders, 'booking-fee-quote', 20, 15 * 60 * 1000)])) {
    return { message: 'Please wait before checking the fitting fee again.', success: false }
  }
  const settings = await getBookingSettings()
  if (!isValidSlotTime(date, time, settings)) {
    return { message: 'Choose an available fitting time.', success: false }
  }
  const slot = getSlotDateTimes(date, time, settings)
  if (!slot || slot.startAt <= new Date()) {
    return { message: 'Choose a future fitting time.', success: false }
  }

  const payload = await getPayload({ config: configPromise })
  const decision = await resolveRepeatBookingDecision({
    email,
    now: new Date(),
    payload,
    requestedAt: slot.startAt,
  })
  if (decision.kind === 'closed') {
    return {
      message: 'Online booking is unavailable after a confirmed purchase. Please call us for further appointments.',
      success: false,
    }
  }
  if (decision.kind === 'free') return { amount: 0, kind: 'repeat', success: true }
  return {
    amount: siteConfig.fittingFee,
    kind: siteConfig.fittingFee === 0 ? 'welcome' : 'standard',
    success: true,
  }
}
