import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto'

import { z } from 'zod'

import { normalizeCustomerEmail } from './email'

const verificationLifetimeMs = 15 * 60 * 1000
const sessionLifetimeMs = 30 * 60 * 1000

const tokenSchema = z.object({
  email: z.email(),
  expiresAt: z.number().int().positive(),
  nonce: z.string().regex(/^[a-f0-9]{64}$/),
  purpose: z.literal('booking-email-verification'),
})

const sessionSchema = z.object({
  email: z.email(),
  expiresAt: z.number().int().positive(),
  purpose: z.literal('verified-booking-email'),
})

function keyFor(secret: string, purpose: string): Buffer {
  if (secret.length < 32) throw new Error('A secure booking verification secret is required.')
  return createHash('sha256').update(`${purpose}\0${secret}`).digest()
}

function encrypt(value: object, secret: string, purpose: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFor(secret, purpose), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}

function decrypt(value: string, secret: string, purpose: string): unknown {
  if (!/^[A-Za-z0-9_-]{40,1024}$/.test(value)) return null
  try {
    const bytes = Buffer.from(value, 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', keyFor(secret, purpose), bytes.subarray(0, 12))
    decipher.setAuthTag(bytes.subarray(12, 28))
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'))
  } catch {
    return null
  }
}

export function createEmailVerificationToken(email: string, secret: string, now = Date.now()): string {
  return encrypt({
    email: normalizeCustomerEmail(email),
    expiresAt: now + verificationLifetimeMs,
    nonce: randomBytes(32).toString('hex'),
    purpose: 'booking-email-verification',
  }, secret, 'email-link')
}

export function readEmailVerificationToken(
  token: string,
  secret: string,
  now = Date.now(),
): z.infer<typeof tokenSchema> | null {
  const result = tokenSchema.safeParse(decrypt(token, secret, 'email-link'))
  return result.success && result.data.expiresAt > now ? result.data : null
}

export function createVerifiedEmailSession(email: string, secret: string, now = Date.now()): string {
  return encrypt({
    email: normalizeCustomerEmail(email),
    expiresAt: now + sessionLifetimeMs,
    purpose: 'verified-booking-email',
  }, secret, 'email-session')
}

export function readVerifiedEmailSession(
  cookie: string | undefined,
  secret: string,
  now = Date.now(),
): string | null {
  if (!cookie) return null
  const result = sessionSchema.safeParse(decrypt(cookie, secret, 'email-session'))
  return result.success && result.data.expiresAt > now ? normalizeCustomerEmail(result.data.email) : null
}

export function emailRequestClaimKey(email: string, secret: string, now = Date.now()): string {
  const bucket = Math.floor(now / verificationLifetimeMs)
  const digest = createHmac('sha256', keyFor(secret, 'request-claim'))
    .update(normalizeCustomerEmail(email))
    .digest('hex')
  return `email:${digest}:${bucket}`
}

export function ipRequestClaimKey(ip: string, secret: string, slot: number, now = Date.now()): string {
  const bucket = Math.floor(now / verificationLifetimeMs)
  const digest = createHmac('sha256', keyFor(secret, 'ip-claim')).update(ip).digest('hex')
  return `ip:${digest}:${bucket}:${slot}`
}

export function redemptionClaimKey(nonce: string): string {
  return `redeem:${createHash('sha256').update(nonce).digest('hex')}`
}

export const verifiedEmailCookieName = 'booking_verified_email'
export const verifiedEmailCookieMaxAge = sessionLifetimeMs / 1000
