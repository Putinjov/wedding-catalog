'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { AvailableSlot } from '@/config/booking'
import {
  formatTimeForCustomer,
  getBookingScheduleLabel,
  getBookingWindowLabel,
  getConfiguredSlotTimes,
  getSlotDateTimes,
  isClosedDate,
  isDateWithinBookingWindow,
  isValidSlotTime,
} from '@/lib/booking/date'
import type { Appointment } from '@/payload-types'

export type AvailableSlotsResult =
  | {
      success: true
      slots: AvailableSlot[]
    }
  | {
      message: string
      success: false
    }

function overlaps(
  appointment: Appointment,
  startAt: Date,
  endAt: Date,
): boolean {
  const appointmentStart = new Date(appointment.startAt).getTime()
  const appointmentEnd = new Date(appointment.endAt).getTime()
  return (
    !Number.isNaN(appointmentStart) &&
    !Number.isNaN(appointmentEnd) &&
    appointmentStart < endAt.getTime() &&
    appointmentEnd > startAt.getTime()
  )
}

export async function getAvailableSlots(date: string): Promise<AvailableSlotsResult> {
  if (!isDateWithinBookingWindow(date)) {
    return {
      message: getBookingWindowLabel(),
      success: false,
    }
  }

  if (isClosedDate(date)) {
    return {
      message: getBookingScheduleLabel(),
      success: false,
    }
  }

  const now = new Date()
  const candidates = getConfiguredSlotTimes()
    .filter((time) => isValidSlotTime(date, time))
    .flatMap((time) => {
      const dateTimes = getSlotDateTimes(date, time)
      if (!dateTimes || dateTimes.startAt <= now) {
        return []
      }

      return [
        {
          endAt: dateTimes.endAt,
          startAt: dateTimes.startAt,
          time,
        },
      ]
    })

  if (candidates.length === 0) {
    return { slots: [], success: true }
  }

  const payload = await getPayload({ config: configPromise })
  const firstCandidate = candidates[0]
  const lastCandidate = candidates[candidates.length - 1]
  const existingAppointments = await payload.find({
    collection: 'appointments',
    depth: 0,
    limit: 100,
    pagination: false,
    where: {
      and: [
        {
          endAt: {
            greater_than: firstCandidate.startAt.toISOString(),
          },
        },
        {
          startAt: {
            less_than: lastCandidate.endAt.toISOString(),
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

  return {
    slots: candidates
      .filter(
        (candidate) =>
          !existingAppointments.docs.some((appointment) =>
            overlaps(appointment, candidate.startAt, candidate.endAt),
          ),
      )
      .map((candidate) => ({
        endAt: candidate.endAt.toISOString(),
        label: formatTimeForCustomer(candidate.startAt.toISOString()),
        startAt: candidate.startAt.toISOString(),
      })),
    success: true,
  }
}
