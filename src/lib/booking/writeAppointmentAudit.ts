import type { CollectionAfterChangeHook } from 'payload'

import { getAppointmentPaymentContext } from '@/lib/booking/paymentIntegrity'
import type { Appointment } from '@/payload-types'

export const writeAppointmentAudit: CollectionAfterChangeHook<Appointment> = async ({
  context,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const paymentContext = getAppointmentPaymentContext(context)
  const statusChanged = previousDoc?.status !== doc.status
  const paymentChanged = previousDoc?.paymentStatus !== doc.paymentStatus
  const action =
    operation === 'create'
      ? 'appointment.created'
      : statusChanged
        ? 'appointment.status_changed'
        : paymentChanged
          ? 'appointment.payment_changed'
          : 'appointment.updated'

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
        needsAdminReview: doc.needsAdminReview ?? false,
        paymentStatus: doc.paymentStatus,
        source: doc.source,
      },
      newStatus: doc.status,
      previousStatus: previousDoc?.status,
      timestamp: new Date().toISOString(),
    },
    overrideAccess: true,
    req,
  })
}
