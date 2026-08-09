import { createHash } from 'node:crypto'

import { APIError, type FieldAccess, type RequestContext } from 'payload'

import {
  adminPrivacyNoticeMethodValues,
  currentPrivacyPolicy,
  type AdminPrivacyNoticeMethod,
} from '@/config/privacy'
import type { Appointment } from '@/payload-types'

export type AppointmentPrivacyOrigin = 'admin-create' | 'public-booking'

type AppointmentPrivacyContext = {
  origin: AppointmentPrivacyOrigin
}

type PrivacyRequestContext = {
  appointmentPrivacy?: AppointmentPrivacyContext
}

export const protectedAppointmentPrivacyFields = [
  'privacyPolicyVersion',
  'privacyNoticeProvidedAt',
  'privacyNoticeMethod',
  'privacyNoticeTextHash',
  'privacyAcknowledgedAt',
  'privacyAcknowledgementTextHash',
  'privacyAcknowledgementSource',
  'marketingConsentStatus',
  'marketingConsentAt',
  'marketingConsentTextHash',
  'marketingConsentChannel',
  'marketingConsentCaptureMethod',
] as const satisfies readonly (keyof Appointment)[]

export function hashPrivacyText(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export const currentPrivacyHashes = {
  acknowledgement: hashPrivacyText(currentPrivacyPolicy.acknowledgementText),
  marketingEmailOptIn: hashPrivacyText(currentPrivacyPolicy.marketingEmailOptInText),
  notice: hashPrivacyText(currentPrivacyPolicy.noticeText),
} as const

export function appointmentPrivacyContext(origin: AppointmentPrivacyOrigin): RequestContext {
  return {
    appointmentPrivacy: { origin },
  }
}

export function getAppointmentPrivacyContext(
  context: RequestContext | undefined,
): AppointmentPrivacyContext | null {
  if (!context) return null
  return (context as PrivacyRequestContext).appointmentPrivacy ?? null
}

export const protectedAppointmentPrivacyFieldWrite: FieldAccess = ({ req }) =>
  Boolean(getAppointmentPrivacyContext(req.context))

function hasOwnField(data: Partial<Appointment>, field: keyof Appointment): boolean {
  return Object.prototype.hasOwnProperty.call(data, field)
}

function valuesDiffer(left: unknown, right: unknown): boolean {
  return (left ?? null) !== (right ?? null)
}

function isDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return !Number.isNaN(new Date(value).getTime())
}

function hasNoMarketingEvidence(data: Partial<Appointment>): boolean {
  return (
    !data.marketingConsentAt &&
    !data.marketingConsentTextHash &&
    !data.marketingConsentChannel &&
    !data.marketingConsentCaptureMethod
  )
}

function assertCurrentPolicyRecord(data: Partial<Appointment>): void {
  if (
    data.privacyPolicyVersion !== currentPrivacyPolicy.version ||
    data.privacyNoticeTextHash !== currentPrivacyHashes.notice ||
    !isDateTime(data.privacyNoticeProvidedAt)
  ) {
    throw new APIError('The current privacy notice must be recorded by the server.', 400)
  }
}

function assertPublicPrivacyRecord(data: Partial<Appointment>): void {
  assertCurrentPolicyRecord(data)
  if (
    data.source !== 'website' ||
    data.privacyNoticeMethod !== 'website' ||
    data.privacyAcknowledgementSource !== 'website' ||
    data.privacyAcknowledgementTextHash !== currentPrivacyHashes.acknowledgement ||
    !isDateTime(data.privacyAcknowledgedAt)
  ) {
    throw new APIError('Website bookings require the current privacy acknowledgement.', 400)
  }

  if (data.marketingConsentStatus === 'granted') {
    if (
      !isDateTime(data.marketingConsentAt) ||
      data.marketingConsentTextHash !== currentPrivacyHashes.marketingEmailOptIn ||
      data.marketingConsentChannel !== 'email' ||
      data.marketingConsentCaptureMethod !== 'written'
    ) {
      throw new APIError('Marketing consent evidence is incomplete.', 400)
    }
    return
  }

  if (data.marketingConsentStatus !== 'not_granted' || !hasNoMarketingEvidence(data)) {
    throw new APIError('Marketing consent must remain separate and optional.', 400)
  }
}

function assertAdminPrivacyRecord(data: Partial<Appointment>): void {
  assertCurrentPolicyRecord(data)
  if (
    data.source !== 'admin' ||
    !adminPrivacyNoticeMethodValues.includes(
      data.privacyNoticeMethod as AdminPrivacyNoticeMethod,
    ) ||
    data.privacyAcknowledgedAt ||
    data.privacyAcknowledgementTextHash ||
    data.privacyAcknowledgementSource
  ) {
    throw new APIError('Admin bookings must record notice delivery without fabricating acknowledgement.', 400)
  }

  if (data.marketingConsentStatus !== 'not_asked' || !hasNoMarketingEvidence(data)) {
    throw new APIError('Admin bookings cannot infer marketing consent.', 400)
  }
}

export function assertAppointmentPrivacyFields({
  context,
  data,
  operation,
  originalDoc,
}: {
  context?: RequestContext
  data: Partial<Appointment>
  operation: 'create' | 'update'
  originalDoc?: Appointment
}): void {
  const privacyContext = getAppointmentPrivacyContext(context)

  if (operation === 'create') {
    if (!privacyContext) {
      if (protectedAppointmentPrivacyFields.some((field) => hasOwnField(data, field))) {
        throw new APIError('Privacy evidence fields are server-controlled.', 403)
      }
      throw new APIError('A trusted booking flow must record the privacy notice.', 403)
    }

    if (privacyContext.origin === 'public-booking') {
      assertPublicPrivacyRecord(data)
      return
    }

    assertAdminPrivacyRecord(data)
    return
  }

  if (!originalDoc) {
    throw new APIError('The persisted appointment is required for privacy-safe updates.', 400)
  }

  const changedFields = protectedAppointmentPrivacyFields.filter(
    (field) => hasOwnField(data, field) && valuesDiffer(data[field], originalDoc[field]),
  )
  if (changedFields.length > 0) {
    throw new APIError('Recorded privacy evidence is immutable.', 403)
  }
}
