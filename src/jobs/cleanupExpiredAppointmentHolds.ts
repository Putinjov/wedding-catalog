import type { TaskConfig } from 'payload'

import {
  cleanupExpiredAppointmentHolds,
  expiredHoldCleanupBatchSize,
  type ExpiredHoldCleanupResult,
} from '@/lib/booking/cleanupExpiredAppointmentHolds'

export const expiredHoldCleanupQueue = 'booking-maintenance'
export const expiredHoldCleanupTaskSlug = 'cleanupExpiredAppointmentHolds'

type CleanupExpiredAppointmentHoldsTask = {
  input: Record<string, never>
  output: ExpiredHoldCleanupResult
}

export const cleanupExpiredAppointmentHoldsTask: TaskConfig<CleanupExpiredAppointmentHoldsTask> = {
  slug: expiredHoldCleanupTaskSlug,
  concurrency: {
    exclusive: true,
    key: () => 'booking-maintenance:expired-holds',
    supersedes: false,
  },
  handler: async ({ job, req }) => {
    const result = await cleanupExpiredAppointmentHolds({
      batchSize: expiredHoldCleanupBatchSize,
      payload: req.payload,
      req,
    })

    req.payload.logger.info({
      msg: 'Expired appointment hold cleanup completed.',
      job: expiredHoldCleanupTaskSlug,
      jobId: String(job.id),
      ...result,
    })

    return { output: result }
  },
  inputSchema: [],
  label: 'Clean up expired appointment holds',
  onFail: ({ job, req, taskStatus }) => {
    req.payload.logger.error({
      msg: 'ALERT: Expired appointment hold cleanup failed.',
      job: expiredHoldCleanupTaskSlug,
      jobId: String(job.id),
      totalTried: taskStatus?.totalTried ?? job.totalTried,
    })
  },
  outputSchema: [
    { name: 'expired', type: 'number', required: true },
    { name: 'hasMore', type: 'checkbox', required: true },
    { name: 'scanned', type: 'number', required: true },
    { name: 'skipped', type: 'number', required: true },
  ],
  retries: 0,
}
