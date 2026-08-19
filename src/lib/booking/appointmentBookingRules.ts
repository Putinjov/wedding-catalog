import { APIError, type RequestContext } from 'payload'

import type { ResolvedBookingSettings } from '@/config/booking'
import { getAppointmentSlotDetails } from '@/lib/booking/appointmentIntegrity'
import {
  getBookingNoticeMessage,
  getBookingNoticeViolation,
} from '@/lib/booking/noticeRules'
import type { Appointment } from '@/payload-types'
import { isAppointmentStatusNonBlocking } from '@/lib/booking/appointmentLifecycle'

type AdminBookingRulesContext = {
  allowNoticeOverride: boolean
  origin: 'admin-create' | 'admin-reschedule' | 'paid-conflict-resolution'
}

type BookingRulesRequestContext = {
  appointmentBookingRules?: AdminBookingRulesContext
}

export function adminBookingRulesContext(allowNoticeOverride: boolean): RequestContext {
  return {
    appointmentBookingRules: {
      allowNoticeOverride,
      origin: 'admin-create',
    },
  }
}

export function paidConflictBookingRulesContext(
  allowNoticeOverride: boolean,
): RequestContext {
  return {
    appointmentBookingRules: {
      allowNoticeOverride,
      origin: 'paid-conflict-resolution',
    },
  }
}

export function adminRescheduleBookingRulesContext(
  allowNoticeOverride: boolean,
): RequestContext {
  return {
    appointmentBookingRules: {
      allowNoticeOverride,
      origin: 'admin-reschedule',
    },
  }
}

export function getAdminBookingRulesContext(
  context: RequestContext | undefined,
): AdminBookingRulesContext | null {
  if (!context) return null
  const bookingRules = (context as BookingRulesRequestContext).appointmentBookingRules
  return (bookingRules?.origin === 'admin-create' ||
    bookingRules?.origin === 'admin-reschedule' ||
    bookingRules?.origin === 'paid-conflict-resolution') &&
    typeof bookingRules.allowNoticeOverride === 'boolean'
    ? bookingRules
    : null
}

function fieldChanged(
  data: Partial<Appointment>,
  originalDoc: Appointment,
  field: 'endAt' | 'startAt',
): boolean {
  return Object.prototype.hasOwnProperty.call(data, field) && data[field] !== originalDoc[field]
}

export function assertAppointmentScheduleRules({
  context,
  data,
  now = new Date(),
  operation,
  originalDoc,
  settings,
}: {
  context?: RequestContext
  data: Partial<Appointment>
  now?: Date
  operation: 'create' | 'update'
  originalDoc?: Appointment
  settings: ResolvedBookingSettings
}): {
  effectiveStatus: Appointment['status']
  endAt: string | undefined
  scheduleChanged: boolean
  startAt: string | undefined
} {
  const effectiveStatus = data.status ?? originalDoc?.status ?? 'pending_payment'
  const bookingTimeChanged =
    operation === 'create' ||
    Boolean(
      operation === 'update' &&
        originalDoc &&
        (fieldChanged(data, originalDoc, 'startAt') || fieldChanged(data, originalDoc, 'endAt')),
    )
  const reopening =
    operation === 'update' &&
    originalDoc != null &&
    isAppointmentStatusNonBlocking(originalDoc.status) &&
    !isAppointmentStatusNonBlocking(effectiveStatus)
  const scheduleChanged = bookingTimeChanged || reopening
  const startAt = data.startAt ?? originalDoc?.startAt
  const endAt = data.endAt ?? originalDoc?.endAt

  if (!scheduleChanged || isAppointmentStatusNonBlocking(effectiveStatus)) {
    return { effectiveStatus, endAt, scheduleChanged, startAt }
  }

  if (!startAt || !endAt) {
    throw new APIError('A complete appointment slot is required.', 400)
  }

  const slot = getAppointmentSlotDetails({ endAt, startAt }, settings, now)
  if (!slot) {
    throw new APIError('Choose a future configured fitting time within the booking window.', 400)
  }

  if (bookingTimeChanged) {
    const violation = getBookingNoticeViolation({
      dateKey: slot.dateKey,
      now,
      settings,
      startAt: slot.startAt,
    })
    const override = getAdminBookingRulesContext(context)?.allowNoticeOverride === true
    if (violation && !override) {
      throw new APIError(getBookingNoticeMessage(violation, settings), 400)
    }
  }

  return { effectiveStatus, endAt, scheduleChanged, startAt }
}
