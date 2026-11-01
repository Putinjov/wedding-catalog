import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getServerEnvironment } from '@/config/env'
import { normalizeCustomerEmail } from '@/lib/customers/email'
import { readVerifiedEmailSession, verifiedEmailCookieName } from '@/lib/customers/emailVerification'
import { getServerSideURL } from '@/utilities/getURL'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const responseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== getServerSideURL()) {
    return NextResponse.json({ verified: false }, { headers: responseHeaders, status: 403 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ verified: false }, { headers: responseHeaders, status: 400 })
  }
  const parsed = z.object({ email: z.email().max(254) }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ verified: false }, { headers: responseHeaders, status: 400 })
  }
  const secret = getServerEnvironment({ strict: false }).PAYLOAD_SECRET
  const cookieStore = await cookies()
  const verifiedEmail = secret
    ? readVerifiedEmailSession(cookieStore.get(verifiedEmailCookieName)?.value, secret)
    : null
  return NextResponse.json(
    { verified: verifiedEmail === normalizeCustomerEmail(parsed.data.email) },
    { headers: responseHeaders },
  )
}
