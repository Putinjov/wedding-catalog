import { after } from 'next/server'
import type { PayloadRequest, TypedUser } from 'payload'

import {
  appointmentEmailQueue,
  sendAppointmentEmailTaskSlug,
} from '@/jobs/sendAppointmentEmail'
import type { Appointment, EmailDelivery } from '@/payload-types'

import type { AppointmentEmailEvent } from './types'

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof Error && /duplicate|idempotencyKey.*unique/i.test(error.message)
}

async function findDelivery(
  req: PayloadRequest,
  idempotencyKey: string,
): Promise<EmailDelivery | null> {
  const result = await req.payload.find({
    collection: 'email-deliveries',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: { idempotencyKey: { equals: idempotencyKey } },
  })
  return result.docs[0] ?? null
}

function scheduleImmediateRun(
  req: PayloadRequest,
  deliveryId: EmailDelivery['id'],
  jobId: number | string,
): void {
  try {
    after(async () => {
      try {
        await req.payload.jobs.runByID({
          id: jobId,
          overrideAccess: true,
          silent: true,
        })
      } catch {
        req.payload.logger.error({
          deliveryId: String(deliveryId),
          job: sendAppointmentEmailTaskSlug,
          msg: 'Immediate appointment email dispatch failed; the queued job remains retryable.',
        })
      }
    })
  } catch {
    req.payload.logger.info({
      deliveryId: String(deliveryId),
      job: sendAppointmentEmailTaskSlug,
      msg: 'Appointment email queued for the fallback worker.',
    })
  }
}

export async function queueAppointmentEmail({
  appointment,
  event,
  idempotencyKey,
  req,
  requestedBy,
  trigger,
}: {
  appointment: Appointment
  event: AppointmentEmailEvent
  idempotencyKey: string
  req: PayloadRequest
  requestedBy?: TypedUser
  trigger: 'automatic' | 'manual'
}): Promise<EmailDelivery> {
  const existing = await findDelivery(req, idempotencyKey)
  if (existing) return existing

  let delivery: EmailDelivery
  try {
    delivery = await req.payload.create({
      collection: 'email-deliveries',
      data: {
        appointment: appointment.id,
        attempts: 0,
        event,
        idempotencyKey,
        requestedBy: requestedBy?.id,
        status: 'queued',
        trigger,
      },
      depth: 0,
      overrideAccess: true,
      req,
    })
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    const duplicate = await findDelivery(req, idempotencyKey)
    if (!duplicate) throw error
    return duplicate
  }

  const job = await req.payload.jobs.queue({
    input: { deliveryId: String(delivery.id) },
    overrideAccess: true,
    queue: appointmentEmailQueue,
    req,
    task: sendAppointmentEmailTaskSlug,
  })
  delivery = await req.payload.update({
    collection: 'email-deliveries',
    id: delivery.id,
    data: { jobId: String(job.id) },
    depth: 0,
    overrideAccess: true,
    req,
  })
  scheduleImmediateRun(req, delivery.id, job.id)
  return delivery
}
