import type { TaskConfig } from 'payload'

import {
  markEmailDeliveryFailed,
  sendAppointmentEmail,
} from '@/lib/notifications/sendAppointmentEmail'

export const appointmentEmailQueue = 'appointment-email'
export const sendAppointmentEmailTaskSlug = 'sendAppointmentEmail'

type SendAppointmentEmailTask = {
  input: {
    deliveryId: string
  }
  output: {
    deliveryId: string
    status: 'sent' | 'skipped'
  }
}

export const sendAppointmentEmailTask: TaskConfig<SendAppointmentEmailTask> = {
  slug: sendAppointmentEmailTaskSlug,
  concurrency: {
    exclusive: true,
    key: ({ input }) => `appointment-email:${input.deliveryId}`,
    supersedes: false,
  },
  handler: async ({ input, req }) => {
    const status = await sendAppointmentEmail({
      deliveryId: input.deliveryId,
      req,
    })
    return { output: { deliveryId: input.deliveryId, status } }
  },
  inputSchema: [{ name: 'deliveryId', type: 'text', required: true }],
  label: 'Send appointment email',
  onFail: async ({ input, req }) => {
    const deliveryId = (input as { deliveryId?: unknown } | undefined)?.deliveryId
    if (typeof deliveryId !== 'string' || deliveryId.length === 0) return
    await markEmailDeliveryFailed({ deliveryId, payload: req.payload, req })
    req.payload.logger.error({
      deliveryId,
      job: sendAppointmentEmailTaskSlug,
      msg: 'ALERT: Appointment email delivery exhausted its retries.',
    })
  },
  outputSchema: [
    { name: 'deliveryId', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      options: ['sent', 'skipped'],
      required: true,
    },
  ],
  retries: {
    attempts: 3,
    backoff: { delay: 15 * 60 * 1000, type: 'exponential' },
  },
}
