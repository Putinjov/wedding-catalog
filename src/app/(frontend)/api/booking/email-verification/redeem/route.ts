import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { z } from 'zod'

import { getServerEnvironment } from '@/config/env'
import {
  createVerifiedEmailSession,
  readEmailVerificationToken,
  redemptionClaimKey,
  verifiedEmailCookieMaxAge,
  verifiedEmailCookieName,
} from '@/lib/customers/emailVerification'
import { createVerificationClaim } from '@/lib/customers/verificationClaims'
import { getServerSideURL } from '@/utilities/getURL'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const requestSchema = z.object({ token: z.string().min(40).max(1024) })
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
    return NextResponse.json({ message: 'The link is invalid or expired.' }, { headers: responseHeaders, status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'The link is invalid or expired.' }, { headers: responseHeaders, status: 400 })
  }

  try {
    const secret = getServerEnvironment({ strict: false }).PAYLOAD_SECRET
    if (!secret) throw new Error('Booking verification is not configured.')
    const verified = readEmailVerificationToken(parsed.data.token, secret)
    if (!verified) {
      return NextResponse.json({ message: 'The link is invalid or expired.' }, { headers: responseHeaders, status: 410 })
    }
    const payload = await getPayload({ config: configPromise })
    if (!(await createVerificationClaim(payload, redemptionClaimKey(verified.nonce)))) {
      return NextResponse.json({ message: 'This link has already been used.' }, { headers: responseHeaders, status: 410 })
    }

    const result = NextResponse.json({ message: 'Email verified. You can continue booking.' }, { headers: responseHeaders })
    result.cookies.set(verifiedEmailCookieName, createVerifiedEmailSession(verified.email, secret), {
      httpOnly: true,
      maxAge: verifiedEmailCookieMaxAge,
      path: '/',
      sameSite: 'lax',
      secure: new URL(getServerSideURL()).protocol === 'https:',
    })
    return result
  } catch (error) {
    console.error('[booking-verification] Redemption failed.', {
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    return NextResponse.json({ message: 'Email verification is temporarily unavailable.' }, { headers: responseHeaders, status: 503 })
  }
}
