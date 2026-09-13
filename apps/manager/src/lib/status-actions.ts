import type { AppointmentDetail, AppointmentStatus } from '@/types'

export type StatusAction = {
  acknowledgePaidCancellation?: boolean
  acknowledgePaidReopen?: boolean
  allowUnpaidManualConfirmation?: boolean
  confirmMessage?: string
  destructive?: boolean
  label: string
  status: AppointmentStatus
}

function reopenedStatus(appointment: AppointmentDetail): AppointmentStatus | null {
  if (appointment.paymentStatus === 'unpaid') return 'pending_payment'
  if (appointment.paymentStatus === 'processing') return 'payment_processing'
  if (appointment.paymentStatus === 'failed') return 'payment_failed'
  if (appointment.paymentStatus === 'paid') return 'confirmed'
  return null
}

export function getStatusActions(appointment: AppointmentDetail): StatusAction[] {
  if (appointment.status === 'pending_payment') {
    return [
      ...(appointment.source === 'admin'
        ? [
            {
              allowUnpaidManualConfirmation: true,
              confirmMessage:
                'Confirm this unpaid manual booking? This bypasses online fitting-fee payment.',
              label: 'Mark confirmed',
              status: 'confirmed' as const,
            },
          ]
        : []),
      { destructive: true, label: 'Cancel appointment', status: 'cancelled' },
    ]
  }

  if (appointment.status === 'payment_processing' || appointment.status === 'payment_failed') {
    return [{ destructive: true, label: 'Cancel appointment', status: 'cancelled' }]
  }

  if (appointment.status === 'confirmed') {
    const isPast = new Date(appointment.endAt).getTime() <= Date.now()
    return [
      ...(isPast
        ? [
            { label: 'Mark completed', status: 'completed' as const },
            { label: 'Mark no-show', status: 'no_show' as const },
          ]
        : []),
      ...(appointment.paymentStatus === 'unpaid'
        ? [{ label: 'Return to pending payment', status: 'pending_payment' as const }]
        : []),
      {
        acknowledgePaidCancellation: appointment.paymentStatus === 'paid' || undefined,
        confirmMessage:
          appointment.paymentStatus === 'paid'
            ? 'This appointment is paid. Cancelling does not issue a refund. Continue?'
            : 'Cancel this appointment?',
        destructive: true,
        label: 'Cancel appointment',
        status: 'cancelled',
      },
    ]
  }

  if (appointment.status === 'cancelled') {
    const status = reopenedStatus(appointment)
    if (!status) return []
    return [
      {
        acknowledgePaidReopen: appointment.paymentStatus === 'paid' || undefined,
        confirmMessage:
          appointment.paymentStatus === 'paid'
            ? 'Reopen this paid appointment? Check that its original slot is still correct.'
            : 'Reopen this appointment?',
        label: 'Reopen appointment',
        status,
      },
    ]
  }

  return []
}
