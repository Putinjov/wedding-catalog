import { APIError, type Payload, type RequestContext, type TypedUser } from 'payload'

import type { Appointment } from '@/payload-types'
import {
  assertAppointmentLifecycleTransition,
  AppointmentLifecycleError,
  getReopenedAppointmentStatus,
} from '@/lib/booking/appointmentLifecycle'

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

  if (
    currentStatus === 'completed' ||
    currentStatus === 'no_show' ||
    currentStatus === 'expired' ||
    currentStatus === 'refunded' ||
    currentStatus === 'partially_refunded'
  ) {
    throw new AdminAppointmentError('That terminal appointment cannot be reopened.')
  }

  if (nextStatus === 'confirmed') {
    if (currentStatus === 'cancelled' && appointment.paymentStatus === 'paid') {
      if (!options.acknowledgePaidReopen) {
        throw new AdminAppointmentError(PAID_REOPEN_WARNING)
      }
      return PAID_REOPEN_WARNING
    }
    if (
      currentStatus === 'pending_payment' &&
      appointment.paymentStatus === 'unpaid' &&
      appointment.source === 'admin' &&
      options.allowUnpaidManualConfirmation
    ) {
      return UNPAID_MANUAL_CONFIRMATION_WARNING
    }
    throw new AdminAppointmentError(
      'Only an explicitly acknowledged unpaid admin booking or a paid cancelled booking can be confirmed manually.',
    )
  }

  if (nextStatus === 'completed' || nextStatus === 'no_show') {
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
    if (
      currentStatus !== 'pending_payment' &&
      currentStatus !== 'payment_processing' &&
      currentStatus !== 'payment_failed' &&
      currentStatus !== 'confirmed'
    ) {
      throw new AdminAppointmentError('That appointment cannot be cancelled from its current state.')
    }
    if (appointment.paymentStatus === 'paid' && !options.acknowledgePaidCancellation) {
      throw new AdminAppointmentError(PAID_CANCELLATION_WARNING)
    }
    return appointment.paymentStatus === 'paid' ? PAID_CANCELLATION_WARNING : null
  }

  if (
    nextStatus === 'pending_payment' ||
    nextStatus === 'payment_processing' ||
    nextStatus === 'payment_failed'
  ) {
    const expectedReopenedStatus = getReopenedAppointmentStatus(appointment.paymentStatus)
    const canReopenCancelled =
      currentStatus === 'cancelled' && nextStatus === expectedReopenedStatus
    const canRevertUnpaidConfirmation =
      currentStatus === 'confirmed' &&
      appointment.paymentStatus === 'unpaid' &&
      nextStatus === 'pending_payment'
    if (!canReopenCancelled && !canRevertUnpaidConfirmation) {
      throw new AdminAppointmentError('That appointment cannot return to an active payment state.')
    }
    return null
  }

  throw new AdminAppointmentError('Payment, expiry, conflict, and refund states are server-controlled.')
}

export function assertAppointmentStatusTransition(args: Parameters<typeof validateAppointmentStatusTransition>[0]) {
  try {
    const result = validateAppointmentStatusTransition(args)
    assertAppointmentLifecycleTransition(
      {
        paymentStatus: args.appointment.paymentStatus,
        status: args.appointment.status,
      },
      {
        paymentStatus: args.appointment.paymentStatus,
        status: args.nextStatus,
      },
    )
    return result
  } catch (error) {
    if (error instanceof AdminAppointmentError) {
      throw new APIError(error.message, error.status)
    }
    if (error instanceof AppointmentLifecycleError) {
      throw new APIError(error.message, 400)
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
  try {
    assertAppointmentLifecycleTransition(
      { paymentStatus: appointment.paymentStatus, status: appointment.status },
      { paymentStatus: appointment.paymentStatus, status: nextStatus },
    )
  } catch (error) {
    if (error instanceof AppointmentLifecycleError) {
      throw new AdminAppointmentError(error.message)
    }
    throw error
  }

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
