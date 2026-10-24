import { getPayload } from 'payload'

import { getServerEnvironment } from '@/config/env'
import { isCronRequestAuthorized, privateCronResponseHeaders } from '@/lib/cron/request'
import { queueDayBeforeAppointmentReminders } from '@/lib/notifications/queueAppointmentReminders'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'

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
    const result = await queueDayBeforeAppointmentReminders(payload)

    if (result.overflow) {
      payload.logger.error({
        candidates: result.candidates,
        msg: 'ALERT: Appointment reminder batch limit reached; some reminders may not be queued.',
      })
      return Response.json(
        { ...result, status: 'incomplete' },
        { headers: privateCronResponseHeaders, status: 500 },
      )
    }

    payload.logger.info({
      candidates: result.candidates,
      msg: 'Day-before appointment reminders queued.',
    })
    return Response.json(
      { ...result, status: 'ok' },
      { headers: privateCronResponseHeaders },
    )
  } catch (error) {
    console.error(
      JSON.stringify({
        alert: true,
        errorName: error instanceof Error ? error.name : 'Error',
        message: 'Appointment reminder cron failed before completion.',
      }),
    )
    return Response.json(
      { status: 'failed' },
      { headers: privateCronResponseHeaders, status: 500 },
    )
  }
}
