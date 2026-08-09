import { getPayload } from 'payload'

import { getServerEnvironment } from '@/config/env'
import { appointmentEmailQueue, sendAppointmentEmailTaskSlug } from '@/jobs/sendAppointmentEmail'
import {
  isCronRequestAuthorized,
  privateCronResponseHeaders,
} from '@/lib/cron/request'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'

export const emailCronBatchSize = 5

export async function GET(request: Request): Promise<Response> {
  const secret = getServerEnvironment({ strict: false }).CRON_SECRET
  if (!secret) {
    return Response.json(
      { status: 'unconfigured' },
      { headers: privateCronResponseHeaders, status: 503 },
    )
  }
  if (!isCronRequestAuthorized(request, secret)) {
    return Response.json(
      { status: 'unauthorized' },
      { headers: privateCronResponseHeaders, status: 401 },
    )
  }

  try {
    const { default: config } = await import('@payload-config')
    const payload = await getPayload({ config })
    const result = await payload.jobs.run({
      limit: emailCronBatchSize,
      overrideAccess: true,
      queue: appointmentEmailQueue,
      sequential: true,
      silent: true,
    })
    const statuses = Object.values(result.jobStatus ?? {}).map((job) => job.status)
    const failed = statuses.filter((status) => status !== 'success').length
    const processed = statuses.length

    const details = {
      failed,
      processed,
      remaining: result.remainingJobsFromQueried,
    }
    if (failed > 0) {
      payload.logger.error({
        ...details,
        job: sendAppointmentEmailTaskSlug,
        msg: 'ALERT: Appointment email fallback worker completed with failures.',
      })
      return Response.json(
        { ...details, status: 'failed' },
        { headers: privateCronResponseHeaders, status: 500 },
      )
    }

    payload.logger.info({
      ...details,
      job: sendAppointmentEmailTaskSlug,
      msg: 'Appointment email fallback worker completed.',
    })
    return Response.json(
      { ...details, status: 'ok' },
      { headers: privateCronResponseHeaders },
    )
  } catch (error) {
    console.error(
      JSON.stringify({
        alert: true,
        errorName: error instanceof Error ? error.name : 'Error',
        job: sendAppointmentEmailTaskSlug,
        message: 'Appointment email fallback worker failed before completion.',
      }),
    )
    return Response.json(
      { status: 'failed' },
      { headers: privateCronResponseHeaders, status: 500 },
    )
  }
}
