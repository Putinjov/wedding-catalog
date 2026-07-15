import type { Appointment, Dress } from '@/payload-types'

export type AppointmentStatus = Appointment['status']
export type PaymentStatus = Appointment['paymentStatus']

export type CalendarDress = {
  id: Dress['id']
  name: string
  slug?: string | null
}

export type CalendarAppointment = {
  id: Appointment['id']
  publicReference: string
  customerName: string
  startAt: string
  endAt: string
  purpose: Appointment['purpose']
  status: AppointmentStatus
  paymentStatus: PaymentStatus
  dress?: CalendarDress | null
}

export type AppointmentDetail = CalendarAppointment & {
  email: string
  phone: string
  notes?: string | null
  internalNotes?: string | null
  fittingFee: number
  amountPaid?: number | null
  currency: Appointment['currency']
  source: Appointment['source']
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
}

export type ManualAppointmentDress = CalendarDress & {
  availableForRent?: boolean | null
  forSale?: boolean | null
}

export const appointmentStatuses: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no-show',
]

export const paymentStatuses: PaymentStatus[] = [
  'unpaid',
  'pending',
  'paid',
  'refunded',
  'failed',
]

export function getRelatedDress(
  dress: Appointment['dress'],
): CalendarDress | null {
  if (!dress || typeof dress === 'string' || typeof dress === 'number') {
    return null
  }

  return {
    id: dress.id,
    name: dress.name,
    slug: dress.slug,
  }
}

export function toCalendarAppointment(appointment: Appointment): CalendarAppointment {
  return {
    id: appointment.id,
    publicReference: appointment.publicReference,
    customerName: appointment.customerName,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    purpose: appointment.purpose,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    dress: getRelatedDress(appointment.dress),
  }
}

export function toAppointmentDetail(appointment: Appointment): AppointmentDetail {
  return {
    ...toCalendarAppointment(appointment),
    email: appointment.email,
    phone: appointment.phone,
    notes: appointment.notes,
    internalNotes: appointment.internalNotes,
    fittingFee: appointment.fittingFee,
    amountPaid: appointment.amountPaid,
    currency: appointment.currency,
    source: appointment.source,
    stripeCheckoutSessionId: appointment.stripeCheckoutSessionId,
    stripePaymentIntentId: appointment.stripePaymentIntentId,
  }
}
