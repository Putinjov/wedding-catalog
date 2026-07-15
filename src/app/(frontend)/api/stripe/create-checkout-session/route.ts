import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createFittingCheckoutSession } from '@/lib/stripe/createFittingCheckoutSession'
import {
  consumeRateLimits,
  identifierRateLimitRule,
  ipRateLimitRule,
} from '@/lib/security/rateLimit'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  reference: z.string().regex(/^fit_[a-f0-9]{32}$/),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid payment request.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payment request.' }, { status: 400 })
  }

  if (
    !consumeRateLimits([
      ipRateLimitRule(request.headers, 'checkout-session', 20, 15 * 60 * 1000),
      identifierRateLimitRule(
        parsed.data.reference,
        'checkout-session:reference',
        10,
        15 * 60 * 1000,
      ),
    ])
  ) {
    return NextResponse.json(
      { message: 'Too many payment attempts. Please wait and try again.' },
      { status: 429 },
    )
  }

  try {
    const result = await createFittingCheckoutSession(parsed.data.reference)
    if (result.status === 'not-found') {
      return NextResponse.json({ message: 'Appointment not found.' }, { status: 404 })
    }
    if (result.status === 'redirect') {
      return NextResponse.json({ url: result.url })
    }
    if (result.status === 'paid') {
      return NextResponse.json(
        { message: 'This appointment has already been paid.', status: 'paid' },
        { status: 409 },
      )
    }
    if (result.status === 'processing') {
      return NextResponse.json(
        { message: 'This payment is being processed. Please refresh this page shortly.', status: 'processing' },
        { status: 409 },
      )
    }

    return NextResponse.json({ message: result.message }, { status: 409 })
  } catch {
    return NextResponse.json(
      { message: 'Payment is temporarily unavailable. Please try again shortly.' },
      { status: 500 },
    )
  }
}
