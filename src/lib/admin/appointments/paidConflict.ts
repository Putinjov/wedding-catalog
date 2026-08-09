import Stripe from 'stripe'
import type { Payload, PayloadRequest, TypedUser } from 'payload'
import { z } from 'zod'

import { hasRole } from '@/access/roles'
import { appointmentAuditContext } from '@/lib/booking/appointmentAuditContext'
import { paidConflictBookingRulesContext } from '@/lib/booking/appointmentBookingRules'
import { getSlotDateTimes } from '@/lib/booking/date'
import { appointmentPaymentContext } from '@/lib/booking/paymentIntegrity'
import { getBookingSettingsFromPayload } from '@/lib/booking/settings'
import { getStripeClient } from '@/lib/stripe/client'
import type { Appointment } from '@/payload-types'

import { AdminAppointmentError } from './getCalendarAppointments'

const operationKeySchema = z.uuid()
const refundWorkflow = 'paid-conflict-full-refund'

export const paidConflictActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('contact'),
    channel: z.enum(['email', 'phone']),
    operationKey: operationKeySchema,
  }),
  z.object({ action: z.literal('confirm'), operationKey: operationKeySchema }),
  z.object({ action: z.literal('cancel'), operationKey: operationKeySchema }),
  z.object({ action: z.literal('refund'), operationKey: operationKeySchema }),
  z.object({
    action: z.literal('reschedule'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    allowNoticeOverride: z.boolean().optional(),
    operationKey: operationKeySchema,
  }),
])

export type PaidConflictActionInput = z.infer<typeof paidConflictActionSchema>

function getAuditKey(appointmentId: Appointment['id'], operationKey: string): string {
  return `paid-conflict:${String(appointmentId)}:${operationKey}`
}

async function findAppointment(
  req: PayloadRequest,
  user: TypedUser,
  id: Appointment['id'],
): Promise<Appointment> {
  return req.payload.findByID({
    collection: 'appointments',
    id,
    depth: 1,
    locale: 'en',
    overrideAccess: false,
    req,
    user,
  })
}

async function operationAlreadyApplied(req: PayloadRequest, idempotencyKey: string): Promise<boolean> {
  const result = await req.payload.find({
    collection: 'appointment-audits',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { idempotencyKey: { equals: idempotencyKey } },
  })
  return result.totalDocs > 0
}

function assertOpenPaidConflict(appointment: Appointment): void {
  if (
    appointment.status !== 'payment_received_conflict' ||
    appointment.paymentStatus !== 'paid' ||
    !appointment.needsAdminReview
  ) {
    throw new AdminAppointmentError('This paid conflict has already been resolved.', 409)
  }
}

function resolutionContext({
  action,
  appointment,
  idempotencyKey,
  metadata,
  allowNoticeOverride = false,
}: {
  action: string
  appointment: Appointment
  idempotencyKey: string
  metadata?: Record<string, boolean | number | string | null>
  allowNoticeOverride?: boolean
}) {
  return {
    ...appointmentPaymentContext('paid-conflict-resolution'),
    ...paidConflictBookingRulesContext(allowNoticeOverride),
    ...appointmentAuditContext({
      action,
      idempotencyKey,
      metadata: {
        conflictStatus: appointment.status,
        ...metadata,
      },
    }),
  }
}

function isDuplicateOperationError(error: unknown): boolean {
  return error instanceof Error && /duplicate|idempotencyKey.*unique/i.test(error.message)
}

async function updateConflict(
  req: PayloadRequest,
  user: TypedUser,
  appointment: Appointment,
  idempotencyKey: string,
  action: string,
  data: Partial<Appointment>,
  options?: {
    allowNoticeOverride?: boolean
    metadata?: Record<string, boolean | number | string | null>
  },
): Promise<Appointment> {
  try {
    return await req.payload.update({
      collection: 'appointments',
      id: appointment.id,
      data,
      context: resolutionContext({
        action,
        allowNoticeOverride: options?.allowNoticeOverride,
        appointment,
        idempotencyKey,
        metadata: options?.metadata,
      }),
      depth: 1,
      overrideAccess: false,
      req,
      user,
    })
  } catch (error) {
    if (isDuplicateOperationError(error)) {
      return findAppointment(req, user, appointment.id)
    }
    throw error
  }
}

function findReusableRefund(refunds: Stripe.Refund[], appointment: Appointment): Stripe.Refund | null {
  return (
    refunds.find(
      (refund) =>
        refund.metadata?.appointmentId === String(appointment.id) &&
        refund.metadata?.workflow === refundWorkflow &&
        ['pending', 'requires_action', 'succeeded'].includes(refund.status ?? ''),
    ) ?? null
  )
}

type RefundStatus = NonNullable<Appointment['refundStatus']>

function isRefundStatus(status: string | null): status is RefundStatus {
  return ['canceled', 'failed', 'pending', 'requires_action', 'succeeded'].includes(status ?? '')
}

function safeRefundFailureReason(status: string | null): string | null {
  if (status === 'failed') return 'Stripe reported that the fitting fee refund failed.'
  if (status === 'canceled') return 'Stripe reported that the fitting fee refund was canceled.'
  return null
}

function refundUpdate(
  appointment: Appointment,
  refund: Stripe.Refund,
  userId?: number | string,
): Partial<Appointment> {
  const status = refund.status
  const isFullRefund = refund.amount === appointment.amountPaid
  const succeeded = status === 'succeeded'
  const now = new Date().toISOString()

  if (
    succeeded &&
    (!Number.isInteger(appointment.amountPaid) || (appointment.amountPaid ?? 0) <= 0)
  ) {
    return {
      needsAdminReview: true,
      refundAmount: refund.amount,
      refundFailureReason: null,
      refundedAt: now,
      refundStatus: 'succeeded',
      reviewReason: 'Stripe reported a refund, but the paid fitting fee could not be verified. Admin review required.',
      stripeRefundId: refund.id,
    }
  }

  if (succeeded && isFullRefund) {
    const terminalStatus =
      appointment.status === 'completed' || appointment.status === 'no_show'
        ? appointment.status
        : 'refunded'
    return {
      conflictResolution: 'refunded',
      conflictResolvedAt: now,
      ...(userId != null ? { conflictResolvedBy: String(userId) } : {}),
      needsAdminReview: false,
      paymentStatus: 'refunded',
      refundAmount: refund.amount,
      refundFailureReason: null,
      refundedAt: now,
      refundStatus: 'succeeded',
      reviewReason: null,
      status: terminalStatus,
      stripeRefundId: refund.id,
    }
  }

  if (succeeded) {
    return {
      needsAdminReview: true,
      paymentStatus: 'partially_refunded',
      refundAmount: refund.amount,
      refundFailureReason: null,
      refundedAt: now,
      refundStatus: 'succeeded',
      reviewReason: 'Stripe reported a partial fitting fee refund. Admin review required.',
      status: 'partially_refunded',
      stripeRefundId: refund.id,
    }
  }

  return {
    needsAdminReview: true,
    refundAmount: refund.amount,
    refundFailureReason: safeRefundFailureReason(status),
    refundStatus: isRefundStatus(status) ? status : 'pending',
    reviewReason:
      status === 'failed' || status === 'canceled'
        ? 'The fitting fee refund did not complete. Admin review required.'
        : 'The fitting fee refund is still processing. Admin review required.',
    stripeRefundId: refund.id,
  }
}

async function refundPaidConflict(
  req: PayloadRequest,
  user: TypedUser,
  appointment: Appointment,
  idempotencyKey: string,
  operationKey: string,
): Promise<Appointment> {
  if (!hasRole(user, ['owner', 'manager'])) {
    throw new AdminAppointmentError('Only an owner or manager can refund a fitting fee.', 403)
  }
  if (
    !appointment.stripePaymentIntentId ||
    !Number.isInteger(appointment.amountPaid) ||
    (appointment.amountPaid ?? 0) <= 0
  ) {
    throw new AdminAppointmentError('The paid fitting fee cannot be verified for refund.', 409)
  }
  const amountPaid = appointment.amountPaid
  if (amountPaid == null) {
    throw new AdminAppointmentError('The paid fitting fee cannot be verified for refund.', 409)
  }

  const stripe = getStripeClient()
  let refund: Stripe.Refund
  try {
    const existing = await stripe.refunds.list({
      limit: 100,
      payment_intent: appointment.stripePaymentIntentId,
    })
    refund =
      findReusableRefund(existing.data, appointment) ??
      (await stripe.refunds.create(
        {
          amount: amountPaid,
          metadata: {
            appointmentId: String(appointment.id),
            workflow: refundWorkflow,
          },
          payment_intent: appointment.stripePaymentIntentId,
        },
        { idempotencyKey: `fit-conflict-refund:${String(appointment.id)}:${operationKey}` },
      ))
  } catch {
    req.payload.logger.error({
      appointmentId: appointment.id,
      msg: 'Paid fitting conflict refund request requires retry.',
    })
    throw new AdminAppointmentError(
      'Stripe could not confirm the refund result. The conflict remains open; retry safely.',
      502,
    )
  }

  return updateConflict(
    req,
    user,
    appointment,
    idempotencyKey,
    'appointment.paid_conflict_refund_requested',
    refundUpdate(appointment, refund, user.id),
    { metadata: { refundAmount: refund.amount, refundStatus: refund.status } },
  )
}

export async function applyPaidConflictAction({
  id,
  input,
  req,
  user,
}: {
  id: Appointment['id']
  input: PaidConflictActionInput
  req: PayloadRequest
  user: TypedUser
}): Promise<Appointment> {
  const idempotencyKey = getAuditKey(id, input.operationKey)
  if (await operationAlreadyApplied(req, idempotencyKey)) {
    return findAppointment(req, user, id)
  }

  const appointment = await findAppointment(req, user, id)
  assertOpenPaidConflict(appointment)
  const resolvedAt = new Date().toISOString()

  if (input.action === 'contact') {
    return updateConflict(
      req,
      user,
      appointment,
      idempotencyKey,
      'appointment.paid_conflict_contact_recorded',
      {
        conflictContactMethod: input.channel,
        conflictContactedAt: resolvedAt,
      },
      { metadata: { contactMethod: input.channel } },
    )
  }

  if (input.action === 'refund') {
    return refundPaidConflict(req, user, appointment, idempotencyKey, input.operationKey)
  }

  const resolution = input.action === 'cancel' ? 'cancelled' : 'confirmed'
  const commonData: Partial<Appointment> = {
    conflictResolution: resolution,
    conflictResolvedAt: resolvedAt,
    conflictResolvedBy: user.id,
    needsAdminReview: false,
    reviewReason: null,
    status: resolution,
  }

  if (input.action === 'reschedule') {
    const settings = await getBookingSettingsFromPayload(req.payload, req)
    const slot = getSlotDateTimes(input.date, input.time, settings)
    if (!slot) throw new AdminAppointmentError('Choose a valid fitting date and time.')
    return updateConflict(
      req,
      user,
      appointment,
      idempotencyKey,
      'appointment.paid_conflict_rescheduled',
      {
        ...commonData,
        endAt: slot.endAt.toISOString(),
        startAt: slot.startAt.toISOString(),
      },
      {
        allowNoticeOverride: input.allowNoticeOverride === true,
        metadata: { noticeRulesOverridden: input.allowNoticeOverride === true },
      },
    )
  }

  return updateConflict(
    req,
    user,
    appointment,
    idempotencyKey,
    input.action === 'confirm'
      ? 'appointment.paid_conflict_confirmed'
      : 'appointment.paid_conflict_cancelled',
    commonData,
  )
}

export async function reconcilePaidConflictRefund({
  eventType,
  payload,
  refund,
}: {
  eventType: string
  payload: Payload
  refund: Stripe.Refund
}): Promise<Appointment | null> {
  const paymentIntentId =
    typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : refund.payment_intent?.id
  if (!paymentIntentId) return null

  const result = await payload.find({
    collection: 'appointments',
    depth: 1,
    limit: 2,
    where: { stripePaymentIntentId: { equals: paymentIntentId } },
  })
  if (result.totalDocs !== 1) return null
  const appointment = result.docs[0]
  const belongsToWorkflow =
    refund.id === appointment.stripeRefundId ||
    (refund.metadata?.appointmentId === String(appointment.id) &&
      refund.metadata?.workflow === refundWorkflow)
  if (!belongsToWorkflow) {
    payload.logger.warn({
      appointmentId: appointment.id,
      msg: 'Unrecognized fitting fee refund requires admin review.',
      refundId: refund.id,
    })
    return payload.update({
      collection: 'appointments',
      id: appointment.id,
      data: {
        needsAdminReview: true,
        reviewReason: 'Stripe reported an unrecognized fitting fee refund. Admin review required.',
      },
      context: appointmentPaymentContext('stripe-webhook', eventType),
    })
  }

  if (appointment.stripeRefundId === refund.id && appointment.refundStatus === 'succeeded') {
    return appointment
  }

  return payload.update({
    collection: 'appointments',
    id: appointment.id,
    data: refundUpdate(appointment, refund),
    context: appointmentPaymentContext('stripe-webhook', eventType),
  })
}
