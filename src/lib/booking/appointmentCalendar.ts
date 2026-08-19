import type { BookingVisitDetails } from '@/config/booking'
import { siteConfig } from '@/config/site'
import { getBookingPurposeCustomerLabel } from '@/lib/booking/purpose'
import type { Appointment } from '@/payload-types'

const encoder = new TextEncoder()

function formatUtcDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Calendar date is invalid.')
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeCalendarText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
}

function foldCalendarLine(line: string): string {
  const lines: string[] = []
  let current = ''
  let currentBytes = 0

  for (const character of line) {
    const characterBytes = encoder.encode(character).length
    if (current && currentBytes + characterBytes > 75) {
      lines.push(current)
      current = ` ${character}`
      currentBytes = 1 + characterBytes
      continue
    }
    current += character
    currentBytes += characterBytes
  }
  lines.push(current)
  return lines.join('\r\n')
}

export function buildAppointmentCalendar({
  appointment,
  generatedAt = new Date(),
  visitDetails,
}: {
  appointment: Appointment
  generatedAt?: Date
  visitDetails: BookingVisitDetails
}): string {
  const description = [
    `Purpose: ${getBookingPurposeCustomerLabel(appointment.purpose)}`,
    `Reference: ${appointment.publicReference}`,
    visitDetails.arrivalInstructions
      ? `Arrival: ${visitDetails.arrivalInstructions}`
      : null,
    visitDetails.whatToBring.length > 0
      ? `What to bring: ${visitDetails.whatToBring.join('; ')}`
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CAIT Bridal//Private Fitting//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeCalendarText(appointment.publicReference)}@caitbridal.ie`,
    `DTSTAMP:${formatUtcDate(generatedAt)}`,
    `DTSTART:${formatUtcDate(appointment.startAt)}`,
    `DTEND:${formatUtcDate(appointment.endAt)}`,
    `SUMMARY:${escapeCalendarText(`${siteConfig.name} private fitting`)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    ...(visitDetails.address
      ? [`LOCATION:${escapeCalendarText(visitDetails.address)}`]
      : []),
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return `${lines.map(foldCalendarLine).join('\r\n')}\r\n`
}
