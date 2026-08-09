import type { RequestContext } from 'payload'

export type AppointmentAuditContext = {
  action: string
  idempotencyKey: string
  metadata?: Record<string, boolean | number | string | null>
}

type AuditRequestContext = {
  appointmentAudit?: AppointmentAuditContext
}

export function appointmentAuditContext(
  audit: AppointmentAuditContext,
): RequestContext {
  return { appointmentAudit: audit }
}

export function getAppointmentAuditContext(
  context: RequestContext | undefined,
): AppointmentAuditContext | null {
  if (!context) return null
  return (context as AuditRequestContext).appointmentAudit ?? null
}
