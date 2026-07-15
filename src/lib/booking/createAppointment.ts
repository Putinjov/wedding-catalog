'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { createPublicReference } from '@/lib/booking/createPublicReference'
import { siteConfig } from '@/config/site'
import { getDressBySlug } from '@/lib/getDress'
import {
  getBookingScheduleLabel,
  getBookingWindowLabel,
  getSlotDateTimes,
  isClosedDate,
  isDateWithinBookingWindow,
  isValidSlotTime,
} from '@/lib/booking/date'
import {
  bookingSchema,
  getBookingFieldErrors,
  type BookingFieldErrors,
} from '@/lib/booking/validation'

export type BookingActionResult =
  | {
      reference: string
      success: true
    }
  | {
      fieldErrors?: BookingFieldErrors
      message: string
      success: false
    }

function invalidBooking(
  message: string,
  fieldErrors?: BookingFieldErrors,
): BookingActionResult {
  return {
    fieldErrors,
    message,
    success: false,
  }
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Error && /duplicate|unique/i.test(error.message)
}

export async function createPendingAppointment(input: unknown): Promise<BookingActionResult> {
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) {
    return invalidBooking('Please check the highlighted details.', getBookingFieldErrors(parsed.error))
  }

  const data = parsed.data
  if (!isDateWithinBookingWindow(data.date)) {
    return invalidBooking(getBookingWindowLabel(), {
      date: getBookingWindowLabel(),
    })
  }

  if (isClosedDate(data.date)) {
    return invalidBooking(getBookingScheduleLabel(), {
      date: getBookingScheduleLabel(),
    })
  }

  if (!isValidSlotTime(data.date, data.time)) {
    return invalidBooking('Choose one of the available fitting times.', {
      time: 'Choose one of the available fitting times.',
    })
  }

  const dateTimes = getSlotDateTimes(data.date, data.time)
  if (!dateTimes || dateTimes.startAt <= new Date()) {
    return invalidBooking('That fitting time is no longer available. Please choose another.', {
      time: 'That fitting time is no longer available. Please choose another.',
    })
  }

  const dressSlug = data.dressSlug || undefined
  const dress = dressSlug ? await getDressBySlug(dressSlug) : null
  if (dressSlug && !dress) {
    return invalidBooking('That dress is no longer available to select.', {
      dressSlug: 'Please remove this dress and choose another option.',
    })
  }

  if (dress) {
    const purposeIsSupported = data.purpose === 'buy' ? dress.forSale : dress.availableForRent
    if (!purposeIsSupported) {
      return invalidBooking('Choose a fitting purpose supported by the selected dress.', {
        purpose: 'This dress is not available for that purpose.',
      })
    }
  }

  const payload = await getPayload({ config: configPromise })
  const startAt = dateTimes.startAt.toISOString()
  const endAt = dateTimes.endAt.toISOString()
  const conflict = await payload.find({
    collection: 'appointments',
    depth: 0,
    limit: 1,
    where: {
      and: [
        {
          endAt: {
            greater_than: startAt,
          },
        },
        {
          startAt: {
            less_than: endAt,
          },
        },
        {
          status: {
            not_equals: 'cancelled',
          },
        },
      ],
    },
  })

  if (conflict.docs.length > 0) {
    return invalidBooking('That fitting time has just been taken. Please choose another.', {
      time: 'That fitting time has just been taken. Please choose another.',
    })
  }

  try {
    const appointment = await payload.create({
      collection: 'appointments',
      draft: false,
      data: {
        customerName: data.customerName,
        dress: dress?.id,
        email: data.email,
        endAt,
        fittingFee: siteConfig.fittingFee,
        notes: data.notes || undefined,
        paymentStatus: 'unpaid',
        phone: data.phone,
        publicReference: createPublicReference(),
        purpose: data.purpose,
        source: 'website',
        startAt,
        status: 'pending',
        currency: siteConfig.currency,
      },
    })

    return {
      reference: appointment.publicReference,
      success: true,
    }
  } catch (error: unknown) {
    if (isUniqueConflict(error)) {
      return invalidBooking('That fitting time has just been taken. Please choose another.', {
        time: 'That fitting time has just been taken. Please choose another.',
      })
    }

    throw error
  }
}
