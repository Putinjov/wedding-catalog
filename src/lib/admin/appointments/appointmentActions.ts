import type { PayloadRequest, TypedUser } from 'payload'
import { z } from 'zod'

import { hasRole } from '@/access/roles'
import { appointmentAuditContext } from '@/lib/booking/appointmentAuditContext'
import { adminRescheduleBookingRulesContext } from '@/lib/booking/appointmentBookingRules'
import { getSlotDateTimes } from '@/lib/booking/date'
import { getBookingSettingsFromPayload } from '@/lib/booking/settings'
import type { Appointment } from '@/payload-types'

import { AdminAppointmentError } from './getCalendarAppointments'
import {
  isDuplicateAppointmentOperationError,
  wasAppointmentOperationApplied,
} from './appointmentOperation'

const operationKeySchema = z.uuid()

export const rescheduleAppointmentSchema = z.object({
  allowNoticeOverride: z.boolean().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  operationKey: operationKeySchema,
  time: z.string().regex(/^\d{2}:\d{2}$/),
})

export const updateAppointmentNotesSchema = z.object({
  internalNotes: z.string().max(1000),
  operationKey: operationKeySchema,
})

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>
export type UpdateAppointmentNotesInput = z.infer<typeof updateAppointmentNotesSchema>

function getOperationKey(
  action: 'notes' | 'reschedule',
  appointmentId: Appointment['id'],
  operationKey: string,
): string {
  return `appointment-admin:${action}:${String(appointmentId)}:${operationKey}`
}

function assertAppointmentTeam(user: TypedUser): void {
  if (!hasRole(user, ['owner', 'manager', 'staff'])) {
    throw new AdminAppointmentError('You do not have access to appointment administration.', 403)
  }
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

export async function rescheduleAppointment({
  id,
  input,
  req,
  user,
}: {
  id: Appointment['id']
  input: RescheduleAppointmentInput
  req: PayloadRequest
  user: TypedUser
}): Promise<Appointment> {
  assertAppointmentTeam(user)
  const idempotencyKey = getOperationKey('reschedule', id, input.operationKey)
  if (await wasAppointmentOperationApplied(req, idempotencyKey)) {
    return findAppointment(req, user, id)
  }

  const appointment = await findAppointment(req, user, id)
  if (appointment.status !== 'confirmed') {
    throw new AdminAppointmentError('Only a confirmed appointment can be rescheduled.', 409)
  }

  const settings = await getBookingSettingsFromPayload(req.payload, req)
  const slot = getSlotDateTimes(input.date, input.time, settings)
  if (!slot) throw new AdminAppointmentError('Choose a valid fitting date and time.')

  const startAt = slot.startAt.toISOString()
  const endAt = slot.endAt.toISOString()
  if (appointment.startAt === startAt && appointment.endAt === endAt) {
    throw new AdminAppointmentError('Choose a different fitting date or time.', 409)
  }

  try {
    return await req.payload.update({
      collection: 'appointments',
      id: appointment.id,
      data: { endAt, startAt },
      context: {
        ...adminRescheduleBookingRulesContext(input.allowNoticeOverride === true),
        ...appointmentAuditContext({
          action: 'appointment.rescheduled',
          idempotencyKey,
          metadata: {
            nextStartAt: startAt,
            noticeRulesOverridden: input.allowNoticeOverride === true,
            previousStartAt: appointment.startAt,
          },
        }),
      },
      depth: 1,
      overrideAccess: false,
      req,
      user,
    })
  } catch (error) {
    if (isDuplicateAppointmentOperationError(error)) {
      return findAppointment(req, user, appointment.id)
    }
    throw error
  }
}

export async function updateAppointmentNotes({
  id,
  input,
  req,
  user,
}: {
  id: Appointment['id']
  input: UpdateAppointmentNotesInput
  req: PayloadRequest
  user: TypedUser
}): Promise<Appointment> {
  assertAppointmentTeam(user)
  const idempotencyKey = getOperationKey('notes', id, input.operationKey)
  if (await wasAppointmentOperationApplied(req, idempotencyKey)) {
    return findAppointment(req, user, id)
  }

  const appointment = await findAppointment(req, user, id)
  const internalNotes = input.internalNotes.trim()
  if ((appointment.internalNotes ?? '') === internalNotes) return appointment

  try {
    return await req.payload.update({
      collection: 'appointments',
      id: appointment.id,
      data: { internalNotes: internalNotes || null },
      context: appointmentAuditContext({
        action: 'appointment.internal_notes_updated',
        idempotencyKey,
        metadata: {
          hadInternalNotes: Boolean(appointment.internalNotes),
          hasInternalNotes: Boolean(internalNotes),
        },
      }),
      depth: 1,
      overrideAccess: false,
      req,
      user,
    })
  } catch (error) {
    if (isDuplicateAppointmentOperationError(error)) {
      return findAppointment(req, user, appointment.id)
    }
    throw error
  }
}
