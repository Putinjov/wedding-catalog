import { formatCurrency, siteConfig } from '@/config/site'
import { getCanonicalOrigin } from '@/config/site-url'
import { formatDateTimeForCustomer } from '@/lib/booking/date'
import { getBookingPurposeCustomerLabel } from '@/lib/booking/purpose'
import type { Appointment } from '@/payload-types'

import type { AppointmentEmailEvent } from './types'

export type AppointmentEmailMessage = {
  subject: string
  text: string
}

function customerFooter(contactAddress: string): string {
  return `Questions? Contact ${contactAddress}.\n\n${siteConfig.name}`
}

function appointmentSummary(appointment: Appointment): string {
  return [
    `Date and time: ${formatDateTimeForCustomer(appointment.startAt)}`,
    `Purpose: ${getBookingPurposeCustomerLabel(appointment.purpose)}`,
    `Reference: ${appointment.publicReference}`,
  ].join('\n')
}

function pendingLink(appointment: Appointment): string {
  return `${getCanonicalOrigin()}/book-a-fitting/pending/${encodeURIComponent(appointment.publicReference)}`
}

function bookingLink(): string {
  return `${getCanonicalOrigin()}/book-a-fitting`
}

function customerMessage(
  event: Exclude<AppointmentEmailEvent, 'admin_alert'>,
  appointment: Appointment,
  contactAddress: string,
): AppointmentEmailMessage {
  const summary = appointmentSummary(appointment)
  const footer = customerFooter(contactAddress)

  switch (event) {
    case 'pending':
      return {
        subject: 'Your private fitting request',
        text: `Hello,\n\nWe received your private fitting request. It is not confirmed until the fitting fee has been paid.\n\n${summary}\n\nContinue securely: ${pendingLink(appointment)}\n\n${footer}`,
      }
    case 'confirmed':
      return {
        subject: 'Your private fitting is confirmed',
        text: `Hello,\n\nYour fitting fee and appointment have been confirmed.\n\n${summary}\n\nEvery dress is individually fitted and professionally altered for the customer.\n\n${footer}`,
      }
    case 'failed':
      return {
        subject: 'Your fitting payment was not completed',
        text: `Hello,\n\nYour fitting payment was not completed, so the appointment is not confirmed. Do not send card details by email.\n\n${summary}\n\nReview the private booking: ${pendingLink(appointment)}\n\n${footer}`,
      }
    case 'expired':
      return {
        subject: 'Your fitting hold has expired',
        text: `Hello,\n\nThe unpaid hold for this fitting time has expired and the time is no longer reserved.\n\n${summary}\n\nChoose from current availability: ${bookingLink()}\n\n${footer}`,
      }
    case 'rescheduled':
      return {
        subject: 'Your private fitting has been rescheduled',
        text: `Hello,\n\nYour confirmed private fitting has been rescheduled.\n\n${summary}\n\n${footer}`,
      }
    case 'cancelled':
      return {
        subject: 'Your private fitting has been cancelled',
        text: `Hello,\n\nYour private fitting has been cancelled. This message does not state that any payment was refunded.\n\n${summary}\n\n${footer}`,
      }
    case 'refund': {
      const amount = appointment.refundAmount
      const amountLine =
        Number.isInteger(amount) && (amount ?? 0) > 0
          ? `Refund amount: ${formatCurrency((amount ?? 0) / 100)}`
          : 'The fitting fee refund has been recorded.'
      return {
        subject: 'Your fitting fee refund',
        text: `Hello,\n\n${amountLine}\n\nReference: ${appointment.publicReference}\n\nYour bank may take additional time to display the refund.\n\n${footer}`,
      }
    }
  }
}

export function buildAppointmentEmail({
  adminAddress,
  appointment,
  event,
  replyToAddress,
}: {
  adminAddress: string
  appointment: Appointment
  event: AppointmentEmailEvent
  replyToAddress: string
}): AppointmentEmailMessage & { to: string } {
  if (event === 'admin_alert') {
    const adminURL = `${getCanonicalOrigin()}/admin/collections/appointments/${encodeURIComponent(String(appointment.id))}`
    return {
      subject: 'Appointment requires admin review',
      text: `An appointment requires admin review.\n\nAppointment ID: ${String(appointment.id)}\nStatus: ${appointment.status}\nScheduled time: ${formatDateTimeForCustomer(appointment.startAt)}\n\nOpen the authenticated admin record: ${adminURL}\n\nCustomer contact details and notes are intentionally omitted from this alert.`,
      to: adminAddress,
    }
  }

  return {
    ...customerMessage(event, appointment, replyToAddress),
    to: appointment.email,
  }
}
