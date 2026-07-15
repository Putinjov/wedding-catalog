import { APIError, type Payload, type RequestContext, type TypedUser } from 'payload'

import type { Appointment } from '@/payload-types'

import { AdminAppointmentError } from './getCalendarAppointments'
import type { AppointmentStatus } from './calendarTypes'
import {
  PAID_CANCELLATION_WARNING,
  PAID_REOPEN_WARNING,
  UNPAID_MANUAL_CONFIRMATION_WARNING,
} from './statusWarnings'

export type StatusTransitionOptions = {
  acknowledgePaidCancellation?: boolean
  acknowledgePaidReopen?: boolean
  allowUnpaidManualConfirmation?: boolean
}

type TransitionContext = {
  appointmentStatusTransition?: StatusTransitionOptions
}

export function getStatusTransitionOptions(context: RequestContext): StatusTransitionOptions {
  const candidate = context as TransitionContext
  return candidate.appointmentStatusTransition ?? {}
}

export function validateAppointmentStatusTransition({
  appointment,
  nextStatus,
  options = {},
  now = new Date(),
}: {
  appointment: Pick<Appointment, 'endAt' | 'paymentStatus' | 'source' | 'status'>
  nextStatus: AppointmentStatus
  options?: StatusTransitionOptions
  now?: Date
}): string | null {
  const currentStatus = appointment.status
  if (currentStatus === nextStatus) {
    return null
  }

  if (currentStatus === 'completed' || currentStatus === 'no-show') {
    throw new AdminAppointmentError('Completed and no-show appointments cannot be reopened.')
  }

  if (nextStatus === 'confirmed') {
    if (currentStatus !== 'pending') {
      throw new AdminAppointmentError('Only pending appointments can be confirmed.')
    }
    if (appointment.paymentStatus === 'paid') {
      return null
    }
    if (appointment.source === 'admin' && options.allowUnpaidManualConfirmation) {
      return UNPAID_MANUAL_CONFIRMATION_WARNING
    }
    throw new AdminAppointmentError(
      'Unpaid website appointments cannot be confirmed. Manual appointments require explicit unpaid confirmation.',
    )
  }

  if (nextStatus === 'completed' || nextStatus === 'no-show') {
    if (currentStatus !== 'confirmed') {
      throw new AdminAppointmentError(`Only confirmed appointments can be marked ${nextStatus}.`)
    }
    const endAt = new Date(appointment.endAt)
    if (Number.isNaN(endAt.getTime()) || endAt > now) {
      throw new AdminAppointmentError(`A future appointment cannot be marked ${nextStatus}.`)
    }
    return null
  }

  if (nextStatus === 'cancelled') {
    if (currentStatus !== 'pending' && currentStatus !== 'confirmed') {
      throw new AdminAppointmentError('Only pending or confirmed appointments can be cancelled.')
    }
    if (appointment.paymentStatus === 'paid' && !options.acknowledgePaidCancellation) {
      throw new AdminAppointmentError(PAID_CANCELLATION_WARNING)
    }
    return appointment.paymentStatus === 'paid' ? PAID_CANCELLATION_WARNING : null
  }

  if (nextStatus === 'pending') {
    if (currentStatus !== 'confirmed' && currentStatus !== 'cancelled') {
      throw new AdminAppointmentError('Only confirmed or cancelled appointments can return to pending.')
    }
    if (
      currentStatus === 'cancelled' &&
      appointment.paymentStatus === 'paid' &&
      !options.acknowledgePaidReopen
    ) {
      throw new AdminAppointmentError(PAID_REOPEN_WARNING)
    }
    return currentStatus === 'cancelled' && appointment.paymentStatus === 'paid'
      ? PAID_REOPEN_WARNING
      : null
  }

  throw new AdminAppointmentError('That appointment status transition is not allowed.')
}

export function assertAppointmentStatusTransition(args: Parameters<typeof validateAppointmentStatusTransition>[0]) {
  try {
    return validateAppointmentStatusTransition(args)
  } catch (error) {
    if (error instanceof AdminAppointmentError) {
      throw new APIError(error.message, error.status)
    }
    throw error
  }
}

export async function updateAppointmentStatus({
  payload,
  user,
  id,
  nextStatus,
  options,
}: {
  payload: Payload
  user: TypedUser
  id: Appointment['id']
  nextStatus: AppointmentStatus
  options: StatusTransitionOptions
}) {
  const appointment = await payload.findByID({
    collection: 'appointments',
    id,
    depth: 0,
    overrideAccess: false,
    user,
  })

  const warning = validateAppointmentStatusTransition({ appointment, nextStatus, options })

  const updated = await payload.update({
    collection: 'appointments',
    id,
    data: { status: nextStatus },
    context: { appointmentStatusTransition: options },
    depth: 1,
    overrideAccess: false,
    user,
  })

  return { appointment: updated, warning }
}
