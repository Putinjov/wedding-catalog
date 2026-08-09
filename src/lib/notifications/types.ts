export const appointmentEmailEventValues = [
  'pending',
  'confirmed',
  'failed',
  'expired',
  'rescheduled',
  'cancelled',
  'refund',
  'admin_alert',
] as const

export type AppointmentEmailEvent = (typeof appointmentEmailEventValues)[number]

export const emailDeliveryStatusValues = [
  'queued',
  'sending',
  'sent',
  'failed',
  'skipped',
] as const

export type EmailDeliveryStatus = (typeof emailDeliveryStatusValues)[number]
