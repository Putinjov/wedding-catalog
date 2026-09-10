import {
  publicBusinessAddressLines,
  publicBusinessMapUrl,
  publicBusinessPhone,
  publicBusinessPhoneDisplay,
} from '@/config/business'
import { formatCurrency, siteConfig } from '@/config/site'
import { getCanonicalOrigin } from '@/config/site-url'
import { formatDateTimeForCustomer } from '@/lib/booking/date'
import { isFittingFeeWaived } from '@/lib/booking/fittingFee'
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
  nextSteps?: string
  subject: string
  title: string
}

const brand = {
  antiqueGold: '#c8b79a',
  blush: '#c8b79a',
  card: '#fffdfb',
  charcoal: '#2c2621',
  deepLavender: '#2c2621',
  ivory: '#faf8f6',
  muted: '#625c55',
  warmBorder: '#e6e1d9',
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
  return `Questions or need to change your appointment? Reply to this email or contact ${contactAddress}.\nCall: ${publicBusinessPhoneDisplay}\n\n${siteConfig.name}\n${publicBusinessAddressLines.join(', ')}\nDirections: ${publicBusinessMapUrl}`
}

function appointmentSummaryRows(appointment: Appointment): SummaryRow[] {
  const duration = (Date.parse(appointment.endAt) - Date.parse(appointment.startAt)) / 60_000
  return [
    { label: 'Date & time', value: formatDateTimeForCustomer(appointment.startAt) },
    { label: 'Time zone', value: 'Ireland local time (Europe/Dublin)' },
    ...(Number.isInteger(duration) && duration > 0
      ? [{ label: 'Duration', value: `${duration} minutes` }]
      : []),
    { label: 'Purpose', value: getBookingPurposeCustomerLabel(appointment.purpose) },
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
  const nextSteps = presentation.nextSteps
    ? `<h2 style="margin: 28px 0 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 23px; font-weight: 400;">Your next steps</h2><p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 26px;">${escapeHtml(presentation.nextSteps)}</p>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>${escapeHtml(presentation.subject)}</title>
    <style>@media screen and (max-width: 480px) { .email-card { padding: 28px 20px !important; } h1 { font-size: 30px !important; line-height: 36px !important; } }</style>
  </head>
  <body style="margin: 0; padding: 0; background: ${brand.ivory}; color: ${brand.charcoal};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${brand.ivory}" style="width: 100%; background: ${brand.ivory};">
      <tr>
        <td role="main" align="center" style="padding: 36px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 620px;">
            <tr>
              <td align="center" style="padding: 0 0 24px;">
                <div style="color: ${brand.deepLavender}; font-family: Georgia, 'Times New Roman', serif; font-size: 27px; line-height: 32px; letter-spacing: 4px;">CÁIT</div>
                <div style="margin-top: 3px; color: ${brand.charcoal}; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 14px; letter-spacing: 4px; text-transform: uppercase;">Bridal</div>
              </td>
            </tr>
            <tr>
              <td class="email-card" bgcolor="${brand.card}" style="background: ${brand.card}; border: 1px solid ${brand.warmBorder}; padding: 42px 28px 38px;">
                <p style="margin: 0 0 12px; color: ${brand.deepLavender}; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; line-height: 16px; letter-spacing: 2.4px; text-transform: uppercase;">Private fitting</p>
                <h1 style="margin: 0; color: ${brand.charcoal}; font-family: Georgia, 'Times New Roman', serif; font-size: 38px; font-weight: 400; line-height: 44px;">${escapeHtml(presentation.title)}</h1>
                <div style="width: 42px; height: 2px; margin: 22px 0; background: ${brand.antiqueGold}; font-size: 0; line-height: 0;">&nbsp;</div>
                <p style="margin: 0; color: ${brand.charcoal}; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 26px;">${escapeHtml(presentation.intro)}</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${brand.ivory}" style="width: 100%; margin-top: 28px; padding: 12px 20px; background: ${brand.ivory}; border-left: 3px solid ${brand.blush};">
                  ${renderSummaryRows(summaryRows)}
                </table>

                ${nextSteps}
                ${notice}
                ${cta}
                <h2 style="margin: 28px 0 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 23px; font-weight: 400;">Find the boutique</h2>
                <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 24px;">${publicBusinessAddressLines.map(escapeHtml).join('<br>')}</p>
                <a href="${escapeHtml(publicBusinessMapUrl)}" style="display: inline-block; padding: 14px 0; color: ${brand.charcoal}; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 20px; text-decoration: underline;">Get directions</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 24px 16px 0;">
                <p style="margin: 0; color: ${brand.muted}; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 22px;">Questions or need to change your appointment? Reply to this email or contact<br><a href="mailto:${escapeHtml(contactAddress)}" style="display: inline-block; padding: 11px 0; color: ${brand.charcoal}; overflow-wrap: anywhere; text-decoration: underline;">${escapeHtml(contactAddress)}</a><br><a href="tel:${publicBusinessPhone}" style="display: inline-block; padding: 11px 0; color: ${brand.charcoal}; text-decoration: underline;">${publicBusinessPhoneDisplay}</a></p>
                <p style="margin: 8px 0 0; color: ${brand.muted}; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 18px;">${escapeHtml(siteConfig.name)}</p>
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
        intro: isFittingFeeWaived(appointment.fittingFee)
          ? 'Your private appointment is confirmed. The usual fitting fee is temporarily waived as part of our welcome offer.'
          : 'Your private appointment is confirmed. We look forward to welcoming you.',
        nextSteps:
          'We look forward to helping you find your dress. You can explore the collection before your visit. If your plans change, reply to this email so we can help.',
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
        intro:
          'The unpaid hold for this fitting time has expired and the appointment time is no longer reserved.',
        subject: 'Your fitting hold has expired',
        title: 'Your fitting hold has expired',
      }
    case 'rescheduled':
      return {
        intro:
          'Your confirmed private fitting has been rescheduled. The updated appointment details are below.',
        nextSteps:
          'Please use the date and time shown above instead of your previous appointment details. If this time no longer suits you, reply to this email.',
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
        intro:
          'Your fitting fee refund has been recorded. Your bank may take additional time to display the refund.',
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
  const presentation = getCustomerPresentation(event, appointment)
  const summaryRows = appointmentSummaryRows(appointment)

  if (event === 'confirmed' || event === 'rescheduled') {
    summaryRows.push({
      label: 'Fitting fee',
      value: isFittingFeeWaived(appointment.fittingFee)
        ? 'Free — welcome offer (€0)'
        : `${formatCurrency(appointment.fittingFee)}${appointment.paymentStatus === 'paid' ? ' — paid' : ''}`,
    })
  }
  if (
    event === 'refund' &&
    Number.isInteger(appointment.refundAmount) &&
    (appointment.refundAmount ?? 0) > 0
  ) {
    summaryRows.push({
      label: 'Refund amount',
      value: formatCurrency((appointment.refundAmount ?? 0) / 100),
    })
  }

  // Keep HTML and plain-text content aligned. Private tokens belong only in actionable URLs.
  const text = [
    'Hello,',
    presentation.intro,
    summaryRows.map(({ label, value }) => `${label}: ${value}`).join('\n'),
    presentation.nextSteps,
    presentation.notice,
    presentation.cta ? `${presentation.cta.label}: ${presentation.cta.href}` : undefined,
    customerFooter(contactAddress),
  ]
    .filter(Boolean)
    .join('\n\n')

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
