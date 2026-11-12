import { randomUUID } from 'node:crypto'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import type { ResolvedBookingSettings } from '@/config/booking'
import { createPendingAppointment } from '@/lib/booking/createAppointment'
import { addCalendarDays, getDateKey, getSlotDateTimes } from '@/lib/booking/date'
import { getNoticeEligibleSlotTimes } from '@/lib/booking/noticeRules'
import { getBookingSettingsFromPayload } from '@/lib/booking/settings'
import { createVerifiedEmailSession } from '@/lib/customers/emailVerification'
import { resolveRepeatBookingDecision } from '@/lib/customers/repeatBooking'
import { assertLocalBookingEnvironment } from './helpers/local-booking-environment'

const requestState = vi.hoisted(() => ({ cookie: '' }))

// This opt-in fixture exercises manual linking and repeat entitlement, not Stripe payment.
vi.mock('@/config/site', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/site')>()
  return { ...actual, siteConfig: { ...actual.siteConfig, fittingFee: 0 } }
})

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: requestState.cookie }) }),
  headers: async () => new Headers({ 'x-forwarded-for': '192.0.2.92' }),
}))

// The cache requires a running Next server; keep the real Payload settings and booking rules.
vi.mock('@/lib/booking/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/booking/settings')>()
  return {
    ...actual,
    getBookingSettings: async () => actual.getBookingSettingsFromPayload(
      await getPayload({ config: configPromise }),
    ),
  }
})

function findSlot(settings: ResolvedBookingSettings, now: Date, excludeDate?: string) {
  for (let offset = 3; offset < Math.min(settings.bookingWindowDays, 30); offset += 1) {
    const date = addCalendarDays(getDateKey(now), offset)
    if (!date || date === excludeDate) continue
    const time = getNoticeEligibleSlotTimes({ dateKey: date, now, settings })[0]
    if (time) return { date, time }
  }
  throw new Error('No isolated test fitting slot is available.')
}

describe.skipIf(process.env.LOCAL_BOOKING_FLOW_TEST !== 'true')('local repeat booking flow', () => {
  it('creates a free repeat after a completed visit and blocks online booking after purchase', async () => {
    assertLocalBookingEnvironment()
    const secret = process.env.PAYLOAD_SECRET
    if (!secret) throw new Error('Local booking test secret is missing.')
    const payload = await getPayload({ config: configPromise })
    const mailbox = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    const realNow = new Date()
    try {
      const settings = await getBookingSettingsFromPayload(payload)
      const email = `booking-${randomUUID()}@example.test`
      const baseInput = {
        customerName: 'Test Customer', email, phone: '+353100000000',
        privacyAcknowledged: true, purpose: 'buy',
      }

      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(realNow.getTime() - 45 * 24 * 60 * 60 * 1000))
      requestState.cookie = createVerifiedEmailSession(email, secret)
      const firstSlot = findSlot(settings, new Date())
      const first = await createPendingAppointment({ ...baseInput, ...firstSlot })
      expect(first.success).toBe(true)
      if (!first.success) throw new Error('The initial test appointment was not created.')
      const firstAppointments = await payload.find({
        collection: 'appointments', depth: 0, overrideAccess: true,
        where: { publicReference: { equals: first.reference } },
      })
      const firstAppointment = firstAppointments.docs[0]
      if (!firstAppointment) throw new Error('The initial test appointment is missing.')
      expect(firstAppointment.customer).toBeFalsy()
      const profile = await payload.create({ collection: 'customers',
        data: { email, name: 'Test Customer', orderStatus: 'none' }, overrideAccess: true })
      firstAppointment.customer = profile.id
      expect(firstAppointment.status).toBe('confirmed')

      vi.setSystemTime(realNow)
      await payload.update({
        collection: 'appointments', id: firstAppointment.id, data: { status: 'completed', customer: profile.id },
        depth: 0, overrideAccess: true,
      })

      requestState.cookie = createVerifiedEmailSession(email, secret)
      const repeatSlot = findSlot(settings, new Date())
      const repeatStart = getSlotDateTimes(repeatSlot.date, repeatSlot.time, settings)?.startAt
      if (!repeatStart) throw new Error('The repeat test slot is invalid.')
      const decision = await resolveRepeatBookingDecision({
        email, now: new Date(), payload, requestedAt: repeatStart,
      })
      expect(decision.kind).toBe('free')
      const repeat = await createPendingAppointment({ ...baseInput, ...repeatSlot, purpose: 'follow_up' })
      expect(repeat.success).toBe(true)
      if (!repeat.success) throw new Error('The repeat test appointment was not created.')
      const repeatAppointments = await payload.find({
        collection: 'appointments', depth: 0, overrideAccess: true,
        where: { publicReference: { equals: repeat.reference } },
      })
      const repeatAppointment = repeatAppointments.docs[0]
      expect(repeatAppointment?.customer).toBe(firstAppointment.customer)
      expect(repeatAppointment?.status).toBe('confirmed')
      expect(repeatAppointment?.paymentStatus).toBe('unpaid')
      expect(repeatAppointment?.fittingFee).toBe(0)
      expect(repeatAppointment?.purpose).toBe('follow_up')
      expect(repeatAppointment?.holdExpiresAt).toBeFalsy()
      expect(repeatAppointment?.stripeCheckoutSessionId).toBeFalsy()

      await payload.update({
        collection: 'customers', id: firstAppointment.customer,
        data: { orderStatus: 'awaiting_dress', purchaseConfirmedAt: realNow.toISOString() },
        depth: 0, overrideAccess: true,
      })
      const laterSlot = findSlot(settings, new Date(), repeatSlot.date)
      const laterStart = getSlotDateTimes(laterSlot.date, laterSlot.time, settings)?.startAt
      if (!laterStart) throw new Error('The post-purchase test slot is invalid.')
      expect((await resolveRepeatBookingDecision({
        email, now: new Date(), payload, requestedAt: laterStart,
      })).kind).toBe('closed')
      const afterPurchase = await createPendingAppointment({ ...baseInput, ...laterSlot, purpose: 'follow_up' })
      expect(afterPurchase.success).toBe(false)
      if (!afterPurchase.success) expect(afterPurchase.message).toMatch(/confirmed purchase/i)
      const count = await payload.count({
        collection: 'appointments', overrideAccess: true,
        where: { customer: { equals: firstAppointment.customer } },
      })
      expect(count.totalDocs).toBe(2)
      expect(mailbox).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
      requestState.cookie = ''
      mailbox.mockRestore()
      await payload.destroy()
    }
  }, 30000)
})
