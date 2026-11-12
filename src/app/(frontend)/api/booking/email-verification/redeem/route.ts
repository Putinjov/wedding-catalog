import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { z } from 'zod'

import { getServerEnvironment } from '@/config/env'
import {
  createVerifiedEmailSession,
  codeAttemptClaimKey,
  emailCodeAttemptLimit,
  emailCodeCookieName,
  emailCodeCookiePath,
  matchesEmailCode,
  readEmailCodeChallenge,
  readEmailVerificationToken,
  redemptionClaimKey,
  verifiedEmailCookieMaxAge,
  verifiedEmailCookieName,
} from '@/lib/customers/emailVerification'
import { createVerificationClaim } from '@/lib/customers/verificationClaims'
import { getServerSideURL } from '@/utilities/getURL'
import { normalizeCustomerEmail } from '@/lib/customers/email'
import { consumeRateLimits, ipRateLimitRule } from '@/lib/security/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Accept outstanding links during the switch to codes; new links are no longer issued.
const requestSchema = z.union([
  z.object({ email: z.email().max(254), code: z.string().regex(/^\d{6}$/) }),
  z.object({ token: z.string().min(40).max(1024) }),
])
const responseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== getServerSideURL()) {
    return NextResponse.json({ message: 'Invalid verification request.' }, { headers: responseHeaders, status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Enter the six-digit code from your email.' }, { headers: responseHeaders, status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Enter the six-digit code from your email.' }, { headers: responseHeaders, status: 400 })
  }
  if (!consumeRateLimits([ipRateLimitRule(request.headers, 'booking-code-redemption', 30, 15 * 60 * 1000)])) {
    return NextResponse.json({ message: 'Please wait before trying again.' }, { headers: responseHeaders, status: 429 })
  }

  try {
    const secret = getServerEnvironment({ strict: false }).PAYLOAD_SECRET
    if (!secret) throw new Error('Booking verification is not configured.')
    const isCodeRequest = 'code' in parsed.data
    const verified = 'code' in parsed.data
      ? readEmailCodeChallenge(new NextRequest(request.url, { headers: request.headers }).cookies.get(emailCodeCookieName)?.value ?? '', secret)
      : readEmailVerificationToken(parsed.data.token, secret)
    if (!verified) {
      return NextResponse.json({ message: 'Verification expired. Please request a new code.' }, { headers: responseHeaders, status: 410 })
    }
    const payload = await getPayload({ config: configPromise })
    if (isCodeRequest && 'code' in parsed.data && 'code' in verified) {
      let allowed = false
      for (let slot = 0; slot < emailCodeAttemptLimit; slot += 1) {
        if (await createVerificationClaim(payload, codeAttemptClaimKey(verified.nonce, slot))) {
          allowed = true
          break
        }
      }
      if (!allowed) {
        return NextResponse.json({ message: 'Too many attempts. Please wait 15 minutes and request a new code.' }, { headers: responseHeaders, status: 429 })
      }
      if (verified.email !== normalizeCustomerEmail(parsed.data.email) ||
          !matchesEmailCode(verified.code, parsed.data.code)) {
        return NextResponse.json({ message: 'The code is incorrect. Check your email and try again.' }, { headers: responseHeaders, status: 400 })
      }
    }
    if (!(await createVerificationClaim(payload, redemptionClaimKey(verified.nonce)))) {
      return NextResponse.json({ message: 'This verification has already been used.' }, { headers: responseHeaders, status: 410 })
    }

    const result = NextResponse.json({ message: 'Email verified. You can continue booking.' }, { headers: responseHeaders })
    result.cookies.set(verifiedEmailCookieName, createVerifiedEmailSession(verified.email, secret), {
      httpOnly: true,
      maxAge: verifiedEmailCookieMaxAge,
      path: '/',
      sameSite: 'lax',
      secure: new URL(getServerSideURL()).protocol === 'https:',
    })
    if (isCodeRequest) {
      result.cookies.set(emailCodeCookieName, '', { httpOnly: true, maxAge: 0, path: emailCodeCookiePath, sameSite: 'strict', secure: new URL(getServerSideURL()).protocol === 'https:' })
    }
    return result
  } catch (error) {
    console.error('[booking-verification] Redemption failed.', {
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    return NextResponse.json({ message: 'Email verification is temporarily unavailable.' }, { headers: responseHeaders, status: 503 })
  }
}
