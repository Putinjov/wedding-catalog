import type { BookingFieldErrors, BookingInput } from '@/lib/booking/validation'

export type BookingField = keyof BookingInput
export type BookingStep = 1 | 2 | 3 | 4

export const bookingSteps: ReadonlyArray<{ label: string; step: BookingStep }> = [
  { label: 'Purpose', step: 1 },
  { label: 'Date and time', step: 2 },
  { label: 'Your details', step: 3 },
  { label: 'Review', step: 4 },
]

const bookingFieldOrder: BookingField[] = [
  'purpose',
  'dressSlug',
  'date',
  'time',
  'customerName',
  'email',
  'phone',
  'notes',
  'privacyAcknowledged',
  'marketingEmailOptIn',
]

const bookingFieldSteps: Record<BookingField, BookingStep> = {
  customerName: 3,
  date: 2,
  dressSlug: 1,
  email: 3,
  marketingEmailOptIn: 3,
  notes: 3,
  phone: 3,
  privacyAcknowledged: 3,
  purpose: 1,
  time: 2,
}

export function getBookingFieldStep(field: BookingField): BookingStep {
  return bookingFieldSteps[field]
}

export function getFirstBookingError(
  fieldErrors: BookingFieldErrors,
): BookingField | undefined {
  return bookingFieldOrder.find((field) => Boolean(fieldErrors[field]))
}

export function getBookingErrorsForStep(
  fieldErrors: BookingFieldErrors,
  step: BookingStep,
): BookingFieldErrors {
  const stepErrors: BookingFieldErrors = {}
  for (const field of bookingFieldOrder) {
    if (bookingFieldSteps[field] === step && fieldErrors[field]) {
      stepErrors[field] = fieldErrors[field]
    }
  }

  return stepErrors
}

export function getBookingStepAnnouncement(step: BookingStep): string {
  const label = bookingSteps.find((item) => item.step === step)?.label ?? 'Booking'
  return `Step ${step} of ${bookingSteps.length}: ${label}.`
}
