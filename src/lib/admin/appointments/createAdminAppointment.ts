import type { Payload, TypedUser } from 'payload'
import { z } from 'zod'

import { siteConfig } from '@/config/site'
import { createPublicReference } from '@/lib/booking/createPublicReference'
import {
  getBookingScheduleLabel,
  getBookingWindowLabel,
  getSlotDateTimes,
  isClosedDate,
  isDateWithinBookingWindow,
  isValidSlotTime,
} from '@/lib/booking/date'
import { hasAppointmentSlotConflict } from '@/lib/booking/hasAppointmentSlotConflict'
import { appointmentPaymentContext } from '@/lib/booking/paymentIntegrity'

import { AdminAppointmentError } from './getCalendarAppointments'
import { validateAppointmentStatusTransition } from './updateAppointmentStatus'

export const createAdminAppointmentSchema = z.object({
  purpose: z.enum(['buy', 'rent']),
  dressId: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().trim().min(5).max(40),
  notes: z.string().trim().max(1000).optional(),
  initialStatus: z.enum(['pending', 'confirmed']),
  allowUnpaidManualConfirmation: z.boolean().optional(),
})

export type CreateAdminAppointmentInput = z.infer<typeof createAdminAppointmentSchema>

export async function createAdminAppointment({
  payload,
  user,
  input,
}: {
  payload: Payload
  user: TypedUser
  input: CreateAdminAppointmentInput
}) {
  if (!isDateWithinBookingWindow(input.date)) {
    throw new AdminAppointmentError(getBookingWindowLabel())
  }
  if (isClosedDate(input.date)) {
    throw new AdminAppointmentError(getBookingScheduleLabel())
  }
  if (!isValidSlotTime(input.date, input.time)) {
    throw new AdminAppointmentError('Choose one of the configured fitting times.')
  }

  const dateTimes = getSlotDateTimes(input.date, input.time)
  if (!dateTimes || dateTimes.startAt <= new Date()) {
    throw new AdminAppointmentError('Choose a future fitting time.')
  }

  let dressId: string | undefined
  if (input.dressId) {
    const dress = await payload.findByID({
      collection: 'dresses',
      id: input.dressId,
      depth: 0,
      locale: 'en',
      overrideAccess: false,
      user,
    })
    const supportsPurpose = input.purpose === 'buy' ? dress.forSale : dress.availableForRent
    if (!supportsPurpose) {
      throw new AdminAppointmentError('The selected dress is not available for that purpose.')
    }
    dressId = dress.id
  }

  const slot = {
    startAt: dateTimes.startAt.toISOString(),
    endAt: dateTimes.endAt.toISOString(),
  }
  if (await hasAppointmentSlotConflict(payload, slot)) {
    throw new AdminAppointmentError('That fitting time overlaps another active appointment.')
  }

  const transitionOptions = {
    allowUnpaidManualConfirmation: input.allowUnpaidManualConfirmation,
  }
  if (input.initialStatus === 'confirmed') {
    validateAppointmentStatusTransition({
      appointment: {
        endAt: slot.endAt,
        paymentStatus: 'unpaid',
        source: 'admin',
        status: 'pending',
      },
      nextStatus: 'confirmed',
      options: transitionOptions,
    })
  }

  return payload.create({
    collection: 'appointments',
    data: {
      customerName: input.customerName,
      dress: dressId,
      email: input.email,
      endAt: slot.endAt,
      fittingFee: siteConfig.fittingFee,
      notes: input.notes || undefined,
      paymentStatus: 'unpaid',
      phone: input.phone,
      publicReference: createPublicReference(),
      purpose: input.purpose,
      source: 'admin',
      startAt: slot.startAt,
      status: input.initialStatus,
      currency: siteConfig.currency,
    },
    context: {
      ...appointmentPaymentContext('admin-create'),
      appointmentStatusTransition: transitionOptions,
    },
    depth: 1,
    overrideAccess: false,
    user,
  })
}
