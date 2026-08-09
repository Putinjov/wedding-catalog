import { bookingPurposeValues, type BookingPurpose } from '@/config/booking'
import type { DressMode } from '@/lib/catalogue'

const adminLabels: Record<BookingPurpose, string> = {
  buy: 'Buy',
  rent: 'Rent',
  undecided: 'Undecided',
}

const customerLabels: Record<BookingPurpose, string> = {
  buy: 'Buy',
  rent: 'Rent',
  undecided: 'I’m not sure yet',
}

export type BookingPurposeDressAvailability = {
  supportsBuy: boolean
  supportsRent: boolean
}

export function getAvailableBookingPurposes(
  dress: BookingPurposeDressAvailability | null,
): BookingPurpose[] {
  if (!dress) return [...bookingPurposeValues]

  return bookingPurposeValues.filter(
    (purpose) =>
      purpose === 'undecided' ||
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
  return purpose === 'undecided' ? null : purpose
}

export function getInitialBookingPurpose(
  requestedPurpose: unknown,
  dress: BookingPurposeDressAvailability | null,
): BookingPurpose {
  const availablePurposes = getAvailableBookingPurposes(dress)
  if (isBookingPurpose(requestedPurpose) && availablePurposes.includes(requestedPurpose)) {
    return requestedPurpose
  }

  return availablePurposes[0] ?? 'undecided'
}

export function isBookingPurpose(value: unknown): value is BookingPurpose {
  return bookingPurposeValues.some((purpose) => purpose === value)
}
