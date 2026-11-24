import { getPayload } from 'payload'

import { getServerEnvironment } from '@/config/env'
import { isCronRequestAuthorized, privateCronResponseHeaders } from '@/lib/cron/request'
import { runRetentionCleanup } from '@/lib/privacy/runRetentionCleanup'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const secret = getServerEnvironment({ strict: false }).CRON_SECRET
  if (!secret) return Response.json({ status: 'unconfigured' }, { status: 503, headers: privateCronResponseHeaders })
  if (!isCronRequestAuthorized(request, secret)) {
    return Response.json({ status: 'unauthorized' }, { status: 401, headers: privateCronResponseHeaders })
  }
  try {
    const { default: config } = await import('@payload-config')
    const payload = await getPayload({ config })
    const result = await runRetentionCleanup(payload)
    if (result.hasMore) {
      payload.logger.error({ msg: 'Retention scan limit reached; records need further review.', ...result })
      return Response.json({ status: 'incomplete', ...result }, { status: 503, headers: privateCronResponseHeaders })
    }
    return Response.json({ status: 'ok', ...result }, { headers: privateCronResponseHeaders })
  } catch (error) {
    console.error('[privacy-retention] cleanup failed', { errorType: error instanceof Error ? error.name : 'Error' })
    return Response.json({ status: 'failed' }, { status: 500, headers: privateCronResponseHeaders })
  }
}
