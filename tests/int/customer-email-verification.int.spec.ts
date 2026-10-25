import { describe, expect, it } from 'vitest'

import {
  createEmailVerificationToken,
  createVerifiedEmailSession,
  emailRequestClaimKey,
  readEmailVerificationToken,
  readVerifiedEmailSession,
  redemptionClaimKey,
} from '@/lib/customers/emailVerification'

const secret = 'test-secret-with-at-least-thirty-two-characters'

describe('one-time booking email proof', () => {
  it('encrypts the address, expires the link, and rejects tampering', () => {
    const now = Date.UTC(2026, 9, 25, 12)
    const token = createEmailVerificationToken(' Bride@Example.COM ', secret, now)
    expect(token).not.toContain('bride')
    expect(readEmailVerificationToken(token, secret, now + 14 * 60 * 1000)?.email)
      .toBe('bride@example.com')
    expect(readEmailVerificationToken(token, secret, now + 15 * 60 * 1000)).toBeNull()
    expect(readEmailVerificationToken(`${token.slice(0, -1)}a`, secret, now)).toBeNull()
    expect(readEmailVerificationToken(token, `${secret}-wrong`, now)).toBeNull()
  })

  it('uses a separate short-lived encrypted session for the verified address', () => {
    const now = Date.UTC(2026, 9, 25, 12)
    const cookie = createVerifiedEmailSession('BRIDE@example.com', secret, now)
    expect(cookie).not.toContain('bride')
    expect(readVerifiedEmailSession(cookie, secret, now + 29 * 60 * 1000))
      .toBe('bride@example.com')
    expect(readVerifiedEmailSession(cookie, secret, now + 30 * 60 * 1000)).toBeNull()
  })

  it('uses non-reversible claim keys without raw email or token nonce', () => {
    const now = Date.UTC(2026, 9, 25, 12)
    expect(emailRequestClaimKey('Bride@Example.COM', secret, now))
      .toBe(emailRequestClaimKey(' bride@example.com ', secret, now))
    expect(emailRequestClaimKey('bride@example.com', secret, now))
      .not.toContain('bride@example.com')
    expect(redemptionClaimKey('a'.repeat(64))).not.toContain('a'.repeat(64))
  })
})
