import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claims: new Set<string>(),
  claim: vi.fn(),
  sendEmail: vi.fn(),
}))
const secret = 'local-test-secret-with-more-than-thirty-two-characters'
vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', () => ({
  getPayload: async () => ({ sendEmail: mocks.sendEmail }),
}))
vi.mock('@/config/env', () => ({
  getServerEnvironment: () => ({ PAYLOAD_SECRET: 'local-test-secret-with-more-than-thirty-two-characters' }),
}))
vi.mock('@/utilities/getURL', () => ({ getServerSideURL: () => 'https://caitbridal.ie' }))
vi.mock('@/lib/customers/verificationClaims', () => ({ createVerificationClaim: mocks.claim }))
vi.mock('@/lib/security/rateLimit', () => ({ consumeRateLimits: () => true, ipRateLimitRule: () => ({}) }))

import { POST as requestCode } from '@/app/(frontend)/api/booking/email-verification/route'
import { POST as redeemCode } from '@/app/(frontend)/api/booking/email-verification/redeem/route'
import {
  createEmailCodeChallenge, emailCodeCookieName, matchesEmailCode,
  readEmailCodeChallenge, readVerifiedEmailSession, verifiedEmailCookieName,
} from '@/lib/customers/emailVerification'

function request(body: object, challenge = '', origin = 'https://caitbridal.ie') {
  return new Request('https://caitbridal.ie/api/booking/email-verification/redeem', {
    body: JSON.stringify(body), method: 'POST',
    headers: { origin, 'Content-Type': 'application/json', Cookie: `${emailCodeCookieName}=${challenge}` },
  })
}

describe('six-digit booking email codes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.claims.clear()
    mocks.sendEmail.mockResolvedValue(undefined)
    mocks.claim.mockImplementation(async (_payload: unknown, key: string) => {
      if (mocks.claims.has(key)) return false
      mocks.claims.add(key)
      return true
    })
  })

  it('uses six digits, encrypted challenge, separate key purpose, expiry, and leading zeros', () => {
    const now = Date.now()
    const { code, challenge } = createEmailCodeChallenge(' Bride@Example.com ', secret, now)
    expect(code).toMatch(/^[0-9]{6}$/)
    expect(challenge).not.toContain('bride')
    expect(readEmailCodeChallenge(challenge, secret, now)?.email).toBe('bride@example.com')
    expect(readEmailCodeChallenge(challenge, secret, now + 900_000)).toBeNull()
    expect(readEmailCodeChallenge(challenge, secret + 'wrong', now)).toBeNull()
    expect(readEmailCodeChallenge((challenge[0] === 'a' ? 'b' : 'a') + challenge.slice(1), secret, now)).toBeNull()
    expect(matchesEmailCode('001234', '001234')).toBe(true)
    expect(matchesEmailCode('001234', '1234')).toBe(false)
  })

  it('requires the browser challenge and matching address, then redeems only once concurrently', async () => {
    const { code, challenge } = createEmailCodeChallenge('bride@example.com', secret)
    expect((await redeemCode(request({ email: 'bride@example.com', code }))).status).toBe(410)
    expect((await redeemCode(request({ email: 'other@example.com', code }, challenge))).status).toBe(400)
    const responses = await Promise.all(Array.from({ length: 2 }, () =>
      redeemCode(request({ email: 'BRIDE@example.com', code }, challenge))))
    expect(responses.map((response) => response.status).sort()).toEqual([200, 410])
    const success = responses.find((response) => response.status === 200)!
    expect(readVerifiedEmailSession(success.cookies.get(verifiedEmailCookieName)?.value, secret)).toBe('bride@example.com')
    expect(success.headers.get('Cache-Control')).toContain('no-store')
    expect(success.headers.get('X-Robots-Tag')).toContain('noindex')
    expect(success.cookies.get(emailCodeCookieName)?.value).toBe('')
  })

  it('allows at most five attempts across concurrent requests, including correct guesses after exhaustion', async () => {
    const { code, challenge } = createEmailCodeChallenge('bride@example.com', secret)
    const wrongCode = code === '000000' ? '000001' : '000000'
    const responses = await Promise.all(Array.from({ length: 12 }, () =>
      redeemCode(request({ email: 'bride@example.com', code: wrongCode }, challenge))))
    expect(responses.filter((response) => response.status === 400)).toHaveLength(5)
    expect(responses.filter((response) => response.status === 429)).toHaveLength(7)
    const locked = await redeemCode(request({ email: 'bride@example.com', code }, challenge))
    expect(locked.status).toBe(429)
    expect(locked.cookies.get(verifiedEmailCookieName)).toBeUndefined()
    expect(JSON.stringify([...mocks.claims])).not.toContain('bride')
  })

  it('does not issue a new challenge or reset attempts when the address requests another code', async () => {
    const first = await requestCode(request({ email: 'bride@example.com' }))
    const second = await requestCode(request({ email: 'BRIDE@example.com' }))
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(second.cookies.get(emailCodeCookieName)).toBeUndefined()
    const body = JSON.stringify(await first.json())
    expect(body).not.toContain('bride@example.com')
    expect(body).not.toMatch(/code is: [0-9]{6}/)
  })

  it('rejects expired, malformed and cross-origin requests without consuming attempts', async () => {
    const { code, challenge } = createEmailCodeChallenge('bride@example.com', secret, Date.now() - 900_000)
    expect((await redeemCode(request({ email: 'bride@example.com', code }, challenge))).status).toBe(410)
    expect((await redeemCode(request({ email: 'bride@example.com', code: '12' }, challenge))).status).toBe(400)
    expect((await redeemCode(request({ email: 'bride@example.com', code }, challenge, 'https://other.example'))).status).toBe(403)
    expect(mocks.claim).not.toHaveBeenCalled()
  })
})
