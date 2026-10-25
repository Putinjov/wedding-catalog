import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { z } from 'zod'

import { getEmailAddresses } from '@/config/email'
import { getServerEnvironment } from '@/config/env'
import { normalizeCustomerEmail } from '@/lib/customers/email'
import {
  createEmailVerificationToken,
  emailRequestClaimKey,
  ipRequestClaimKey,
} from '@/lib/customers/emailVerification'
import { createVerificationClaim } from '@/lib/customers/verificationClaims'
import { consumeRateLimits, ipRateLimitRule } from '@/lib/security/rateLimit'
import { getServerSideURL } from '@/utilities/getURL'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const requestSchema = z.object({ email: z.email().max(254) })
const responseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

function response(message: string, status = 200) {
  return NextResponse.json({ message }, { headers: responseHeaders, status })
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== getServerSideURL()) {
    return response('Invalid verification request.', 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return response('Enter a valid email address.', 400)
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return response('Enter a valid email address.', 400)

  if (!consumeRateLimits([ipRateLimitRule(request.headers, 'booking-email-verification', 5, 15 * 60 * 1000)])) {
    return response('Please wait before requesting another link.', 429)
  }

  try {
    const environment = getServerEnvironment({ strict: false })
    const secret = environment.PAYLOAD_SECRET
    if (!secret) throw new Error('Booking verification is not configured.')
    const email = normalizeCustomerEmail(parsed.data.email)
    const payload = await getPayload({ config: configPromise })
    const claim = emailRequestClaimKey(email, secret)
    if (!(await createVerificationClaim(payload, claim))) {
      return response('If the address can receive email, a verification link will arrive shortly.')
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() || 'unknown'
    let ipSlotClaimed = false
    for (let slot = 0; slot < 5; slot += 1) {
      if (await createVerificationClaim(payload, ipRequestClaimKey(ip, secret, slot))) {
        ipSlotClaimed = true
        break
      }
    }
    if (!ipSlotClaimed) {
      await payload.delete({
        collection: 'customer-verification-claims',
        overrideAccess: true,
        where: { claimKey: { equals: claim } },
      })
      return response('Please wait before requesting another link.', 429)
    }

    const token = createEmailVerificationToken(email, secret)
    const link = `${getServerSideURL()}/book-a-fitting/verify#token=${encodeURIComponent(token)}`
    const addresses = getEmailAddresses(environment)
    try {
      await payload.sendEmail({
        from: addresses.from,
        replyTo: addresses.replyTo,
        subject: 'Confirm your email for a CAIT Bridal fitting',
        text: `Confirm your email before booking a fitting. This link expires in 15 minutes and can be used once:\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
        to: email,
      })
    } catch (error) {
      try {
        await payload.delete({
          collection: 'customer-verification-claims',
          overrideAccess: true,
          where: { claimKey: { equals: claim } },
        })
      } catch {
        // The claim expires automatically; never reveal address or provider details.
      }
      throw error
    }
    return response('If the address can receive email, a verification link will arrive shortly.')
  } catch (error) {
    console.error('[booking-verification] Request failed.', {
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    return response('Email verification is temporarily unavailable. Please try again later.', 503)
  }
}
