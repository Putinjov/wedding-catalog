import { randomUUID } from 'node:crypto'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { POST as requestLink } from '@/app/(frontend)/api/booking/email-verification/route'
import { POST as redeemLink } from '@/app/(frontend)/api/booking/email-verification/redeem/route'
import { readVerifiedEmailSession, verifiedEmailCookieName } from '@/lib/customers/emailVerification'
import { assertLocalBookingEnvironment, localBookingOrigin } from './helpers/local-booking-environment'

const enabled = process.env.LOCAL_BOOKING_FLOW_TEST === 'true'
const origin = localBookingOrigin

function post(path: string, body: object): Request {
  return new Request(`${origin}${path}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Origin: origin, 'x-forwarded-for': '192.0.2.91' },
    method: 'POST',
  })
}

describe.skipIf(!enabled)('local booking email verification flow', () => {
  it('delivers a link to an in-memory mailbox and redeems it only once', async () => {
    assertLocalBookingEnvironment()
    const secret = process.env.PAYLOAD_SECRET
    if (!secret) throw new Error('Local booking test secret is missing.')

    const payload = await getPayload({ config: configPromise })
    const mailbox = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    try {
      const email = `booking-${randomUUID()}@example.test`
      const requested = await requestLink(post('/api/booking/email-verification', { email }))
      expect(requested.status).toBe(200)
      expect(requested.headers.get('Cache-Control')).toContain('no-store')
      expect(requested.headers.get('X-Robots-Tag')).toContain('noindex')
      expect(mailbox).toHaveBeenCalledTimes(1)

      const message = mailbox.mock.calls[0]?.[0]
      const link = typeof message?.text === 'string'
        ? message.text.match(/http:\/\/127\.0\.0\.1:3000\/book-a-fitting\/verify#token=([^\s]+)/)?.[1]
        : undefined
      if (!link) throw new Error('The in-memory message did not contain a verification link.')
      const token = decodeURIComponent(link)
      const responses = await Promise.all([
        redeemLink(post('/api/booking/email-verification/redeem', { token })),
        redeemLink(post('/api/booking/email-verification/redeem', { token })),
      ])
      expect(responses.map((response) => response.status).sort()).toEqual([200, 410])
      const success = responses.find((response) => response.status === 200)
      const rejected = responses.find((response) => response.status === 410)
      const cookie = success?.cookies.get(verifiedEmailCookieName)?.value
      expect(Boolean(cookie)).toBe(true)
      expect(Boolean(rejected?.cookies.get(verifiedEmailCookieName))).toBe(false)
      expect(success?.headers.get('Cache-Control')).toContain('no-store')
      expect(success?.headers.get('X-Robots-Tag')).toContain('noindex')
      expect(readVerifiedEmailSession(cookie, secret)).toBe(email)
      expect(readVerifiedEmailSession(cookie, secret) === 'other@example.test').toBe(false)
    } finally {
      mailbox.mockRestore()
      await payload.destroy()
    }
  }, 30000)
})
