import { z } from 'zod'

export const bookingSchema = z.object({
  customerName: z.string().trim().min(2, 'Please enter your name.').max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a date.'),
  dressSlug: z.string().trim().max(200).optional(),
  email: z.string().trim().email('Please enter a valid email address.'),
  notes: z.string().trim().max(1000, 'Please keep notes under 1,000 characters.').optional(),
  phone: z.string().trim().min(7, 'Please enter a valid phone number.').max(30),
  purpose: z.enum(['buy', 'rent']),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Please choose an available time.'),
})

export type BookingInput = z.infer<typeof bookingSchema>
export type BookingFieldErrors = Partial<Record<keyof BookingInput, string>>

export function getBookingFieldErrors(error: z.ZodError<BookingInput>): BookingFieldErrors {
  const fieldErrors: BookingFieldErrors = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && field in bookingSchema.shape && !fieldErrors[field as keyof BookingInput]) {
      fieldErrors[field as keyof BookingInput] = issue.message
    }
  }

  return fieldErrors
}
