import type { PayloadRequest, TypedUser } from 'payload'

import { hasRole } from '@/access/roles'
import {
  appointmentPaymentStatusValues,
  appointmentStatusValues,
  type AppointmentPaymentStatus,
  type AppointmentStatus,
} from '@/lib/booking/appointmentLifecycle'
import type { Appointment, AppointmentAudit, User } from '@/payload-types'

import type {
  AppointmentAuditHistoryEntry,
  AppointmentEmailHistoryEntry,
  AppointmentHistory,
} from './calendarTypes'

const historyLimit = 100
const refundStatuses = ['canceled', 'failed', 'pending', 'requires_action', 'succeeded'] as const
const safeAuditActionPattern = /^[a-z0-9_.-]{1,100}$/

function getMetadata(value: AppointmentAudit['metadata']): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function getStatus(value: unknown): AppointmentStatus | null {
  return typeof value === 'string' && appointmentStatusValues.includes(value as AppointmentStatus)
    ? (value as AppointmentStatus)
    : null
}

function getPaymentStatus(value: unknown): AppointmentPaymentStatus | null {
  return typeof value === 'string' &&
    appointmentPaymentStatusValues.includes(value as AppointmentPaymentStatus)
    ? (value as AppointmentPaymentStatus)
    : null
}

function getRefundStatus(
  value: unknown,
): AppointmentAuditHistoryEntry['refundStatus'] {
  return typeof value === 'string' &&
    refundStatuses.includes(value as (typeof refundStatuses)[number])
    ? (value as (typeof refundStatuses)[number])
    : null
}

function getActorLabel(actor: AppointmentAudit['actor'], actorType: AppointmentAudit['actorType']) {
  if (actor && typeof actor === 'object') {
    const name = (actor as User).name?.trim()
    if (name) return name
  }

  if (actorType === 'stripe') return 'Stripe webhook'
  if (actorType === 'public') return 'Public booking'
  if (actorType === 'system') return 'System'
  return 'Staff user'
}

function toAuditHistoryEntry(audit: AppointmentAudit): AppointmentAuditHistoryEntry {
  const metadata = getMetadata(audit.metadata)
  const refundAmount = metadata.refundAmount

  return {
    id: String(audit.id),
    action: safeAuditActionPattern.test(audit.action) ? audit.action : 'appointment.audit_event',
    actorLabel: getActorLabel(audit.actor, audit.actorType),
    actorType: audit.actorType,
    newStatus: getStatus(audit.newStatus),
    noticeRulesOverridden:
      typeof metadata.noticeRulesOverridden === 'boolean'
        ? metadata.noticeRulesOverridden
        : undefined,
    paymentStatus: getPaymentStatus(metadata.paymentStatus),
    previousPaymentStatus: getPaymentStatus(metadata.previousPaymentStatus),
    previousStatus: getStatus(audit.previousStatus),
    refundAmount:
      typeof refundAmount === 'number' && Number.isInteger(refundAmount) && refundAmount >= 0
        ? refundAmount
        : null,
    refundStatus: getRefundStatus(metadata.refundStatus),
    timestamp: audit.timestamp,
  }
}

export async function getAppointmentHistory({
  appointmentId,
  req,
  user,
}: {
  appointmentId: Appointment['id']
  req: PayloadRequest
  user: TypedUser
}): Promise<AppointmentHistory> {
  const canViewAudits = hasRole(user, ['owner'])
  const canViewEmails = hasRole(user, ['owner', 'manager'])

  const [auditResult, emailResult] = await Promise.all([
    canViewAudits
      ? req.payload.find({
          collection: 'appointment-audits',
          depth: 1,
          limit: historyLimit,
          overrideAccess: false,
          req,
          sort: '-timestamp',
          user,
          where: { appointment: { equals: appointmentId } },
        })
      : null,
    canViewEmails
      ? req.payload.find({
          collection: 'email-deliveries',
          depth: 0,
          limit: historyLimit,
          overrideAccess: false,
          req,
          sort: '-createdAt',
          user,
          where: { appointment: { equals: appointmentId } },
        })
      : null,
  ])

  return {
    audits: auditResult?.docs.map(toAuditHistoryEntry) ?? [],
    emails:
      emailResult?.docs.map(
        (delivery): AppointmentEmailHistoryEntry => ({
          id: String(delivery.id),
          attempts: delivery.attempts,
          createdAt: delivery.createdAt,
          event: delivery.event,
          failureCategory: delivery.lastFailureReason,
          sentAt: delivery.sentAt,
          status: delivery.status,
          trigger: delivery.trigger,
        }),
      ) ?? [],
  }
}
