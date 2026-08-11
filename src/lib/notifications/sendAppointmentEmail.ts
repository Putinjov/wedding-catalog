import type { Payload, PayloadRequest } from 'payload'

import { getEmailAddresses } from '@/config/email'
import { getServerEnvironment } from '@/config/env'
import { shouldDeliverAppointmentEmail } from '@/lib/notifications/appointmentEmailEvents'
import { buildAppointmentEmail } from '@/lib/notifications/appointmentEmailTemplates'
import type { Appointment, EmailDelivery } from '@/payload-types'

const shortRetryDelays = [0, 2_000, 5_000] as const

type SMTPError = {
  code?: unknown
  responseCode?: unknown
}

function getRelationshipID(value: EmailDelivery['appointment']): number | string {
  return typeof value === 'object' && value !== null ? value.id : value
}

function isTransientSMTPError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const smtpError = error as SMTPError
  if (
    typeof smtpError.responseCode === 'number' &&
    smtpError.responseCode >= 400 &&
    smtpError.responseCode < 500
  ) {
    return true
  }

  return (
    typeof smtpError.code === 'string' &&
    ['EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ESOCKET', 'ETIMEDOUT'].includes(smtpError.code)
  )
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function updateDelivery(
  req: PayloadRequest,
  deliveryId: EmailDelivery['id'],
  data: Partial<EmailDelivery>,
): Promise<EmailDelivery> {
  return req.payload.update({
    collection: 'email-deliveries',
    id: deliveryId,
    data,
    depth: 0,
    overrideAccess: true,
    req,
  })
}

export async function markEmailDeliveryFailed({
  deliveryId,
  payload,
  req,
}: {
  deliveryId: number | string
  payload: Payload
  req: PayloadRequest
}): Promise<void> {
  await payload.update({
    collection: 'email-deliveries',
    id: deliveryId,
    data: { status: 'failed' },
    depth: 0,
    overrideAccess: true,
    req,
  })
}

export async function sendAppointmentEmail({
  deliveryId,
  req,
}: {
  deliveryId: number | string
  req: PayloadRequest
}): Promise<'sent' | 'skipped'> {
  const delivery = await req.payload.findByID({
    collection: 'email-deliveries',
    id: deliveryId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (delivery.status === 'sent') return 'sent'
  if (delivery.status === 'skipped') return 'skipped'

  const appointment = await req.payload.findByID({
    collection: 'appointments',
    id: getRelationshipID(delivery.appointment),
    depth: 1,
    overrideAccess: true,
    req,
  }) as Appointment

  if (!shouldDeliverAppointmentEmail(delivery.event, appointment)) {
    await updateDelivery(req, delivery.id, {
      lastFailureReason: null,
      status: 'skipped',
    })
    return 'skipped'
  }

  const addresses = getEmailAddresses(getServerEnvironment({ strict: false }))
  const message = buildAppointmentEmail({
    adminAddress: addresses.admin,
    appointment,
    event: delivery.event,
    replyToAddress: addresses.replyTo,
  })

  let attempts = delivery.attempts
  let finalFailureReason = 'Permanent SMTP delivery failure.'

  for (const retryDelay of shortRetryDelays) {
    if (retryDelay > 0) await wait(retryDelay)
    attempts += 1
    await updateDelivery(req, delivery.id, {
      attempts,
      lastFailureReason: null,
      status: 'sending',
    })

    try {
      await req.payload.sendEmail({
        from: addresses.from,
        ...(message.html ? { html: message.html } : {}),
        replyTo: addresses.replyTo,
        subject: message.subject,
        text: message.text,
        to: message.to,
      })
      await updateDelivery(req, delivery.id, {
        lastFailureReason: null,
        sentAt: new Date().toISOString(),
        status: 'sent',
      })
      return 'sent'
    } catch (error) {
      const transient = isTransientSMTPError(error)
      finalFailureReason = transient
        ? 'Transient SMTP delivery failure.'
        : 'Permanent SMTP delivery failure.'
      await updateDelivery(req, delivery.id, {
        lastFailureReason: finalFailureReason,
        status: 'queued',
      })
      if (!transient) break
    }
  }

  throw new Error(finalFailureReason)
}
