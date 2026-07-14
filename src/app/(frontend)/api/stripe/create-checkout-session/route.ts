import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createFittingCheckoutSession } from '@/lib/stripe/createFittingCheckoutSession'

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
