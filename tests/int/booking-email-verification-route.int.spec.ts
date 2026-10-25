import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createVerificationClaim: vi.fn(),
  delete: vi.fn(),
  getPayload: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: mocks.getPayload,
}))
vi.mock('@/config/env', () => ({
  getServerEnvironment: () => ({
    PAYLOAD_SECRET: 'test-secret-with-at-least-thirty-two-characters',
  }),
}))
vi.mock('@/utilities/getURL', () => ({ getServerSideURL: () => 'https://caitbridal.ie' }))
vi.mock('@/lib/customers/verificationClaims', () => ({
  createVerificationClaim: mocks.createVerificationClaim,
}))

import { POST as requestLink } from '@/app/(frontend)/api/booking/email-verification/route'
import { POST as redeemLink } from '@/app/(frontend)/api/booking/email-verification/redeem/route'
import { createEmailVerificationToken } from '@/lib/customers/emailVerification'

function post(path: string, body: object, origin = 'https://caitbridal.ie'): Request {
  return new Request(`https://caitbridal.ie${path}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Origin: origin, 'x-forwarded-for': '192.0.2.75' },
    method: 'POST',
  })
}

describe('booking email verification routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPayload.mockResolvedValue({ delete: mocks.delete, sendEmail: mocks.sendEmail })
    mocks.createVerificationClaim.mockResolvedValue(true)
    mocks.delete.mockResolvedValue({ docs: [] })
    mocks.sendEmail.mockResolvedValue(undefined)
  })

  it('rejects cross-origin requests before creating claims or sending mail', async () => {
    const response = await requestLink(post('/api/booking/email-verification', {
      email: 'bride@example.com',
    }, 'https://attacker.example'))
    expect(response.status).toBe(403)
    expect(mocks.createVerificationClaim).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('sends a short-lived private link without revealing account existence in the response', async () => {
    const response = await requestLink(post('/api/booking/email-verification', {
      email: 'Bride@Example.COM',
    }))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex')
    expect(JSON.stringify(await response.json())).not.toContain('bride@example.com')
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'bride@example.com',
      text: expect.stringContaining('/book-a-fitting/verify#token='),
    }))
    const claimCalls = mocks.createVerificationClaim.mock.calls
    expect(claimCalls).toHaveLength(2)
    expect(JSON.stringify(claimCalls)).not.toContain('bride@example.com')
  })

  it('redeems the token once and sets a private short-lived cookie', async () => {
    const token = createEmailVerificationToken(
      'bride@example.com', 'test-secret-with-at-least-thirty-two-characters',
    )
    const first = await redeemLink(post('/api/booking/email-verification/redeem', { token }))
    expect(first.status).toBe(200)
    expect(first.headers.get('Set-Cookie')).toMatch(/booking_verified_email=.*HttpOnly.*SameSite=lax/i)
    expect(first.headers.get('Set-Cookie')).toContain('Secure')
    expect(first.headers.get('Cache-Control')).toContain('no-store')

    mocks.createVerificationClaim.mockResolvedValue(false)
    const second = await redeemLink(post('/api/booking/email-verification/redeem', { token }))
    expect(second.status).toBe(410)
    expect(second.headers.get('Set-Cookie')).toBeNull()
  })

  it('releases an unsent email claim for retry without exposing provider details', async () => {
    mocks.sendEmail.mockRejectedValue(new Error('private SMTP detail'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const response = await requestLink(post('/api/booking/email-verification', {
        email: 'retry@example.com',
      }))
      expect(response.status).toBe(503)
      expect(JSON.stringify(await response.json())).not.toContain('SMTP')
      expect(mocks.delete).toHaveBeenCalledWith(expect.objectContaining({
        collection: 'customer-verification-claims',
        where: { claimKey: { equals: expect.stringMatching(/^email:/) } },
      }))
      expect(JSON.stringify(log.mock.calls)).not.toContain('private SMTP detail')
    } finally {
      log.mockRestore()
    }
  })

  it('rejects expired links without writing redemption claims', async () => {
    const token = createEmailVerificationToken(
      'bride@example.com', 'test-secret-with-at-least-thirty-two-characters',
      Date.now() - 16 * 60 * 1000,
    )
    const response = await redeemLink(post('/api/booking/email-verification/redeem', { token }))
    expect(response.status).toBe(410)
    expect(mocks.createVerificationClaim).not.toHaveBeenCalled()
  })
})
