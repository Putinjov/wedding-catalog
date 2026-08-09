import { timingSafeEqual } from 'node:crypto'

import { getPayload } from 'payload'

import { getServerEnvironment } from '@/config/env'
import {
  expiredHoldCleanupQueue,
  expiredHoldCleanupTaskSlug,
} from '@/jobs/cleanupExpiredAppointmentHolds'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'

const responseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

export function isCronRequestAuthorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false

  const authorization = request.headers.get('authorization')
  const expected = `Bearer ${secret}`
  if (!authorization || authorization.length !== expected.length) return false

  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
}

export async function GET(request: Request): Promise<Response> {
  const secret = getServerEnvironment({ strict: false }).CRON_SECRET
  if (!secret) {
    return Response.json(
      { status: 'unconfigured' },
      { headers: responseHeaders, status: 503 },
    )
  }
  if (!isCronRequestAuthorized(request, secret)) {
    return Response.json(
      { status: 'unauthorized' },
      { headers: responseHeaders, status: 401 },
    )
  }

  try {
    const { default: config } = await import('@payload-config')
    const payload = await getPayload({ config })
    const job = await payload.jobs.queue({
      input: {},
      overrideAccess: true,
      queue: expiredHoldCleanupQueue,
      task: expiredHoldCleanupTaskSlug,
    })
    const result = await payload.jobs.runByID({
      id: job.id,
      overrideAccess: true,
    })
    const jobId = String(job.id)
    const runStatus = result.jobStatus?.[jobId]?.status

    if (runStatus !== 'success') {
      payload.logger.error({
        msg: 'ALERT: Expired hold cron invocation did not complete successfully.',
        job: expiredHoldCleanupTaskSlug,
        jobId,
        runStatus: runStatus ?? 'not-run',
      })
      return Response.json(
        { jobId, status: 'failed' },
        { headers: responseHeaders, status: 500 },
      )
    }

    return Response.json({ jobId, status: 'ok' }, { headers: responseHeaders })
  } catch (error) {
    console.error(
      JSON.stringify({
        alert: true,
        errorName: error instanceof Error ? error.name : 'Error',
        job: expiredHoldCleanupTaskSlug,
        message: 'Expired hold cron invocation failed before completion.',
      }),
    )
    return Response.json(
      { status: 'failed' },
      { headers: responseHeaders, status: 500 },
    )
  }
}
