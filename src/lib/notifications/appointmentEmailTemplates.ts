import { formatCurrency, siteConfig } from '@/config/site'
import { getCanonicalOrigin } from '@/config/site-url'
import { formatDateTimeForCustomer } from '@/lib/booking/date'
import { getBookingPurposeCustomerLabel } from '@/lib/booking/purpose'
import type { Appointment } from '@/payload-types'

import type { AppointmentEmailEvent } from './types'

export type AppointmentEmailMessage = {
  html?: string
  subject: string
  text: string
}

type SummaryRow = {
  label: string
  value: string
}

type CustomerEmailPresentation = {
  cta?: { href: string; label: string }
  intro: string
  notice?: string
  subject: string
  title: string
}

const brand = {
  antiqueGold: '#c9a45c',
  blush: '#e8c9d1',
  card: '#fffdfb',
  charcoal: '#332c2f',
  deepLavender: '#8e6fa0',
  ivory: '#fbf6ee',
  muted: '#6f6468',
  warmBorder: '#e5d8cb',
} as const

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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

function appointmentSummaryRows(appointment: Appointment): SummaryRow[] {
  return [
    { label: 'Date & time', value: formatDateTimeForCustomer(appointment.startAt) },
    { label: 'Purpose', value: getBookingPurposeCustomerLabel(appointment.purpose) },
    { label: 'Reference', value: appointment.publicReference },
  ]
}

function pendingLink(appointment: Appointment): string {
  return `${getCanonicalOrigin()}/book-a-fitting/pending/${encodeURIComponent(appointment.publicReference)}`
}

function bookingLink(): string {
  return `${getCanonicalOrigin()}/book-a-fitting`
}

function dressesLink(): string {
  return `${getCanonicalOrigin()}/dresses`
}

function renderSummaryRows(rows: SummaryRow[]): string {
  return rows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding: 10px 0; color: ${brand.muted}; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px; text-transform: uppercase; letter-spacing: 1.1px; vertical-align: top; width: 38%;">${escapeHtml(label)}</td>
          <td style="padding: 10px 0; color: ${brand.charcoal}; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 22px; vertical-align: top;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('')
}

function renderCustomerHtml({
  contactAddress,
  presentation,
  summaryRows,
}: {
  contactAddress: string
  presentation: CustomerEmailPresentation
  summaryRows: SummaryRow[]
}): string {
  const cta = presentation.cta
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 0;">
        <tr>
          <td bgcolor="${brand.deepLavender}" style="border-radius: 3px;">
            <a href="${escapeHtml(presentation.cta.href)}" style="display: inline-block; padding: 13px 22px; color: #fffdfb; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; line-height: 18px; letter-spacing: 0.7px; text-decoration: none; text-transform: uppercase;">${escapeHtml(presentation.cta.label)}</a>
          </td>
        </tr>
      </table>`
    : ''

  const notice = presentation.notice
    ? `<p style="margin: 24px 0 0; padding-top: 20px; border-top: 1px solid ${brand.warmBorder}; color: ${brand.muted}; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 21px;">${escapeHtml(presentation.notice)}</p>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>${escapeHtml(presentation.subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: ${brand.ivory}; color: ${brand.charcoal};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${brand.ivory}" style="width: 100%; background: ${brand.ivory};">
      <tr>
        <td align="center" style="padding: 36px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 620px;">
            <tr>
              <td align="center" style="padding: 0 0 24px;">
                <div style="color: ${brand.deepLavender}; font-family: Georgia, 'Times New Roman', serif; font-size: 27px; line-height: 32px; letter-spacing: 4px;">CAIT</div>
                <div style="margin-top: 3px; color: ${brand.charcoal}; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 14px; letter-spacing: 4px; text-transform: uppercase;">Bridal</div>
              </td>
            </tr>
            <tr>
              <td bgcolor="${brand.card}" style="background: ${brand.card}; border: 1px solid ${brand.warmBorder}; padding: 42px 42px 38px;">
                <p style="margin: 0 0 12px; color: ${brand.deepLavender}; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; line-height: 16px; letter-spacing: 2.4px; text-transform: uppercase;">Private fitting</p>
                <h1 style="margin: 0; color: ${brand.charcoal}; font-family: Georgia, 'Times New Roman', serif; font-size: 38px; font-weight: 400; line-height: 44px;">${escapeHtml(presentation.title)}</h1>
                <div style="width: 42px; height: 2px; margin: 22px 0; background: ${brand.antiqueGold}; font-size: 0; line-height: 0;">&nbsp;</div>
                <p style="margin: 0; color: ${brand.charcoal}; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 26px;">${escapeHtml(presentation.intro)}</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${brand.ivory}" style="width: 100%; margin-top: 28px; padding: 12px 20px; background: ${brand.ivory}; border-left: 3px solid ${brand.blush};">
                  ${renderSummaryRows(summaryRows)}
                </table>

                ${notice}
                ${cta}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 24px 16px 0;">
                <p style="margin: 0; color: ${brand.muted}; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 19px;">Questions? Reply to this email or contact <a href="mailto:${escapeHtml(contactAddress)}" style="color: ${brand.deepLavender}; text-decoration: none;">${escapeHtml(contactAddress)}</a>.</p>
                <p style="margin: 8px 0 0; color: ${brand.muted}; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 18px;">${escapeHtml(siteConfig.name)} · Tullamore, Co. Offaly</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function getCustomerPresentation(
  event: Exclude<AppointmentEmailEvent, 'admin_alert'>,
  appointment: Appointment,
): CustomerEmailPresentation {
  switch (event) {
    case 'pending':
      return {
        cta: { href: pendingLink(appointment), label: 'View booking' },
        intro: 'Your fitting request is waiting for payment and is not yet confirmed.',
        subject: 'Your private fitting request',
        title: 'Your fitting request',
      }
    case 'confirmed':
      return {
        cta: { href: dressesLink(), label: 'Explore the collection' },
        intro: 'Your fitting fee has been verified and your private appointment is confirmed. We look forward to welcoming you.',
        notice: 'Every dress is individually fitted and professionally altered for the customer.',
        subject: 'Your private fitting is confirmed',
        title: 'Your fitting is confirmed',
      }
    case 'failed':
      return {
        cta: { href: pendingLink(appointment), label: 'Review your booking' },
        intro: 'Your fitting payment was not completed, so the appointment is not confirmed.',
        notice: 'For your security, never send card details by email.',
        subject: 'Your fitting payment was not completed',
        title: 'Payment not completed',
      }
    case 'expired':
      return {
        cta: { href: bookingLink(), label: 'Choose another time' },
        intro: 'The unpaid hold for this fitting time has expired and the appointment time is no longer reserved.',
        subject: 'Your fitting hold has expired',
        title: 'Your fitting hold has expired',
      }
    case 'rescheduled':
      return {
        intro: 'Your confirmed private fitting has been rescheduled. The updated appointment details are below.',
        subject: 'Your private fitting has been rescheduled',
        title: 'Your fitting has been rescheduled',
      }
    case 'cancelled':
      return {
        cta: { href: bookingLink(), label: 'Book another fitting' },
        intro: 'Your private fitting has been cancelled.',
        notice: 'This cancellation notice does not state that any payment has been refunded.',
        subject: 'Your private fitting has been cancelled',
        title: 'Your fitting has been cancelled',
      }
    case 'refund':
      return {
        intro: 'Your fitting fee refund has been recorded. Your bank may take additional time to display the refund.',
        subject: 'Your fitting fee refund',
        title: 'Your refund has been recorded',
      }
  }
}

function customerMessage(
  event: Exclude<AppointmentEmailEvent, 'admin_alert'>,
  appointment: Appointment,
  contactAddress: string,
): AppointmentEmailMessage {
  const summary = appointmentSummary(appointment)
  const footer = customerFooter(contactAddress)
  const presentation = getCustomerPresentation(event, appointment)
  let text: string
  let summaryRows = appointmentSummaryRows(appointment)

  switch (event) {
    case 'pending':
      text = `Hello,\n\nWe received your private fitting request. It is not confirmed until the fitting fee has been paid.\n\n${summary}\n\nContinue securely: ${pendingLink(appointment)}\n\n${footer}`
      break
    case 'confirmed':
      text = `Hello,\n\nYour fitting fee and appointment have been confirmed.\n\n${summary}\n\nEvery dress is individually fitted and professionally altered for the customer.\n\n${footer}`
      break
    case 'failed':
      text = `Hello,\n\nYour fitting payment was not completed, so the appointment is not confirmed. Do not send card details by email.\n\n${summary}\n\nReview the private booking: ${pendingLink(appointment)}\n\n${footer}`
      break
    case 'expired':
      text = `Hello,\n\nThe unpaid hold for this fitting time has expired and the time is no longer reserved.\n\n${summary}\n\nChoose from current availability: ${bookingLink()}\n\n${footer}`
      break
    case 'rescheduled':
      text = `Hello,\n\nYour confirmed private fitting has been rescheduled.\n\n${summary}\n\n${footer}`
      break
    case 'cancelled':
      text = `Hello,\n\nYour private fitting has been cancelled. This message does not state that any payment was refunded.\n\n${summary}\n\n${footer}`
      break
    case 'refund': {
      const amount = appointment.refundAmount
      const amountLine =
        Number.isInteger(amount) && (amount ?? 0) > 0
          ? `Refund amount: ${formatCurrency((amount ?? 0) / 100)}`
          : 'The fitting fee refund has been recorded.'
      text = `Hello,\n\n${amountLine}\n\nReference: ${appointment.publicReference}\n\nYour bank may take additional time to display the refund.\n\n${footer}`
      summaryRows = [
        ...(Number.isInteger(amount) && (amount ?? 0) > 0
          ? [{ label: 'Refund amount', value: formatCurrency((amount ?? 0) / 100) }]
          : []),
        { label: 'Reference', value: appointment.publicReference },
      ]
      break
    }
  }

  return {
    html: renderCustomerHtml({ contactAddress, presentation, summaryRows }),
    subject: presentation.subject,
    text,
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
