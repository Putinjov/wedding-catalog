import type { CollectionAfterChangeHook } from 'payload'

import { getAdminBookingRulesContext } from '@/lib/booking/appointmentBookingRules'
import { getAppointmentAuditContext } from '@/lib/booking/appointmentAuditContext'
import { getAppointmentPaymentContext } from '@/lib/booking/paymentIntegrity'
import type { Appointment } from '@/payload-types'

export const writeAppointmentAudit: CollectionAfterChangeHook<Appointment> = async ({
  context,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const auditContext = getAppointmentAuditContext(context)
  const paymentContext = getAppointmentPaymentContext(context)
  const bookingRulesContext = getAdminBookingRulesContext(context)
  const statusChanged = previousDoc?.status !== doc.status
  const paymentChanged = previousDoc?.paymentStatus !== doc.paymentStatus
  const defaultAction =
    operation === 'create'
      ? 'appointment.created'
      : statusChanged
        ? 'appointment.status_changed'
        : paymentChanged
          ? 'appointment.payment_changed'
          : 'appointment.updated'
  const action = auditContext?.action ?? defaultAction

  const actorType = req.user
    ? 'user'
    : paymentContext?.origin === 'stripe-webhook'
      ? 'stripe'
      : paymentContext?.origin === 'public-booking'
        ? 'public'
        : 'system'

  await req.payload.create({
    collection: 'appointment-audits',
    data: {
      action,
      actor: req.user?.id,
      actorType,
      appointment: doc.id,
      metadata: {
        noticeRulesOverridden: bookingRulesContext?.allowNoticeOverride ?? false,
        needsAdminReview: doc.needsAdminReview ?? false,
        paymentStatus: doc.paymentStatus,
        previousPaymentStatus: previousDoc?.paymentStatus ?? null,
        source: doc.source,
        ...(auditContext?.metadata ?? {}),
      },
      idempotencyKey: auditContext?.idempotencyKey,
      newStatus: doc.status,
      previousStatus: previousDoc?.status,
      timestamp: new Date().toISOString(),
    },
    overrideAccess: true,
    req,
  })
}
