'use server'

import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { createPublicReference } from '@/lib/booking/createPublicReference'
import { siteConfig } from '@/config/site'
import { getAvailableDressBySlug, getDressBySlug } from '@/lib/getDress'
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
import { hasAppointmentSlotConflict } from '@/lib/booking/hasAppointmentSlotConflict'
import { createAppointmentHoldExpiry } from '@/lib/booking/appointmentHold'
import {
  getWebsiteBookingInitialPaymentState,
  requiresFittingFeePayment,
} from '@/lib/booking/fittingFee'
import { getBookingSettings } from '@/lib/booking/settings'
import { appointmentPaymentContext } from '@/lib/booking/paymentIntegrity'
import {
  appointmentPrivacyContext,
  currentPrivacyHashes,
} from '@/lib/booking/privacyIntegrity'
import { currentPrivacyPolicy } from '@/config/privacy'
import { getBookingPurposeDressMode } from '@/lib/booking/purpose'
import {
  getBookingNoticeMessage,
  getBookingNoticeViolation,
} from '@/lib/booking/noticeRules'
import {
  consumeRateLimits,
  identifierRateLimitRule,
  ipRateLimitRule,
} from '@/lib/security/rateLimit'

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

function isBookingConflict(error: unknown): boolean {
  return (
    isUniqueConflict(error) ||
    (error instanceof Error && /already reserved|being processed for this date|overlaps another/i.test(error.message))
  )
}

export async function createPendingAppointment(input: unknown): Promise<BookingActionResult> {
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) {
    return invalidBooking('Please check the highlighted details.', getBookingFieldErrors(parsed.error))
  }

  const data = parsed.data
  const requestHeaders = await headers()
  const rateLimitAllowed = consumeRateLimits([
    ipRateLimitRule(requestHeaders, 'public-booking', 10, 15 * 60 * 1000),
    identifierRateLimitRule(data.email, 'public-booking:email', 3, 60 * 60 * 1000),
    identifierRateLimitRule(data.phone, 'public-booking:phone', 3, 60 * 60 * 1000),
  ])
  if (!rateLimitAllowed) {
    return invalidBooking('Too many booking attempts. Please wait and try again.')
  }
  const settings = await getBookingSettings()
  const now = new Date()
  if (!isDateWithinBookingWindow(data.date, settings, now)) {
    return invalidBooking(getBookingWindowLabel(settings), {
      date: getBookingWindowLabel(settings),
    })
  }

  if (isClosedDate(data.date, settings)) {
    return invalidBooking(getBookingScheduleLabel(settings), {
      date: getBookingScheduleLabel(settings),
    })
  }

  if (!isValidSlotTime(data.date, data.time, settings)) {
    return invalidBooking('Choose one of the available fitting times.', {
      time: 'Choose one of the available fitting times.',
    })
  }

  const dateTimes = getSlotDateTimes(data.date, data.time, settings)
  if (!dateTimes || dateTimes.startAt <= now) {
    return invalidBooking('That fitting time is no longer available. Please choose another.', {
      time: 'That fitting time is no longer available. Please choose another.',
    })
  }

  const noticeViolation = getBookingNoticeViolation({
    dateKey: data.date,
    now,
    settings,
    startAt: dateTimes.startAt,
  })
  if (noticeViolation) {
    const message = getBookingNoticeMessage(noticeViolation, settings)
    return invalidBooking(message, { time: message })
  }

  const dressSlug = data.dressSlug || undefined
  const dressMode = getBookingPurposeDressMode(data.purpose)
  const dress = dressSlug
    ? dressMode
      ? await getAvailableDressBySlug(dressSlug, dressMode)
      : await getDressBySlug(dressSlug)
    : null
  if (dressSlug && !dress) {
    return invalidBooking(
      dressMode
        ? 'That dress is no longer available for the selected purpose.'
        : 'That dress can no longer be included with this fitting request.',
      {
        dressSlug: 'Please remove this dress or choose another option.',
        ...(dressMode ? { purpose: 'This dress is not available for that purpose.' } : {}),
      },
    )
  }

  const payload = await getPayload({ config: configPromise })
  const startAt = dateTimes.startAt.toISOString()
  const endAt = dateTimes.endAt.toISOString()
  if (await hasAppointmentSlotConflict(payload, { startAt, endAt }, settings)) {
    return invalidBooking('That fitting time has just been taken. Please choose another.', {
      time: 'That fitting time has just been taken. Please choose another.',
    })
  }

  try {
    const privacyRecordedAt = new Date().toISOString()
    const paymentState = getWebsiteBookingInitialPaymentState()
    const holdExpiresAt = requiresFittingFeePayment()
      ? createAppointmentHoldExpiry(settings.holdMinutes, now).iso
      : null
    const appointment = await payload.create({
      collection: 'appointments',
      draft: false,
      data: {
        customerName: data.customerName,
        dress: dress?.id,
        email: data.email,
        endAt,
        fittingFee: siteConfig.fittingFee,
        ...(holdExpiresAt ? { holdExpiresAt } : {}),
        notes: data.notes || undefined,
        paymentStatus: paymentState.paymentStatus,
        phone: data.phone,
        privacyAcknowledgedAt: privacyRecordedAt,
        privacyAcknowledgementSource: 'website',
        privacyAcknowledgementTextHash: currentPrivacyHashes.acknowledgement,
        privacyNoticeMethod: 'website',
        privacyNoticeProvidedAt: privacyRecordedAt,
        privacyNoticeTextHash: currentPrivacyHashes.notice,
        privacyPolicyVersion: currentPrivacyPolicy.version,
        marketingConsentStatus: data.marketingEmailOptIn ? 'granted' : 'not_granted',
        ...(data.marketingEmailOptIn
          ? {
              marketingConsentAt: privacyRecordedAt,
              marketingConsentCaptureMethod: 'written' as const,
              marketingConsentChannel: 'email' as const,
              marketingConsentTextHash: currentPrivacyHashes.marketingEmailOptIn,
            }
          : {}),
        publicReference: createPublicReference(),
        purpose: data.purpose,
        source: 'website',
        startAt,
        status: paymentState.status,
        currency: siteConfig.currency,
      },
      context: {
        ...appointmentPaymentContext('public-booking'),
        ...appointmentPrivacyContext('public-booking'),
      },
    })

    return {
      reference: appointment.publicReference,
      success: true,
    }
  } catch (error: unknown) {
    if (isBookingConflict(error)) {
      return invalidBooking('That fitting time has just been taken. Please choose another.', {
        time: 'That fitting time has just been taken. Please choose another.',
      })
    }

    throw error
  }
}
