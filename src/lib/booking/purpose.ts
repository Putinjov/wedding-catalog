import { bookingPurposeValues, type BookingPurpose } from '@/config/booking'
import type { DressMode } from '@/lib/catalogue'

const adminLabels: Record<BookingPurpose, string> = {
  buy: 'Buy',
  rent: 'Rent',
  undecided: 'Undecided',
  follow_up: 'Follow-up appointment',
}

const customerLabels: Record<BookingPurpose, string> = {
  buy: 'Buy',
  rent: 'Rent',
  undecided: 'I’m not sure yet',
  follow_up: 'Follow-up appointment',
}

export type BookingPurposeDressAvailability = {
  supportsBuy: boolean
  supportsRent: boolean
}

export function getAvailableBookingPurposes(
  dress: BookingPurposeDressAvailability | null,
): BookingPurpose[] {
  const publicPurposes = bookingPurposeValues.filter((purpose) => purpose !== 'undecided')
  if (!dress) return publicPurposes

  return publicPurposes.filter(
    (purpose) =>
      purpose === 'follow_up' ||
      (purpose === 'buy' ? dress.supportsBuy : dress.supportsRent),
  )
}

export function getBookingPurposeAdminLabel(purpose: BookingPurpose): string {
  return adminLabels[purpose]
}

export function getBookingPurposeCustomerLabel(purpose: BookingPurpose): string {
  return customerLabels[purpose]
}

export function getBookingPurposeDressMode(purpose: BookingPurpose): DressMode | null {
  return purpose === 'buy' || purpose === 'rent' ? purpose : null
}

export function getInitialBookingPurpose(
  requestedPurpose: unknown,
  dress: BookingPurposeDressAvailability | null,
): BookingPurpose {
  const availablePurposes = getAvailableBookingPurposes(dress)
  if (isBookingPurpose(requestedPurpose) && availablePurposes.includes(requestedPurpose)) {
    return requestedPurpose
  }

  return availablePurposes[0] ?? 'follow_up'
}

export function isBookingPurpose(value: unknown): value is BookingPurpose {
  return bookingPurposeValues.some((purpose) => purpose === value)
}
