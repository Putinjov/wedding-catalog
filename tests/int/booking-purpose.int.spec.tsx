import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { BookingSummary } from '@/components/booking/booking-summary'
import { purposeOptions } from '@/components/booking/booking-flow'
import { createAdminAppointmentSchema } from '@/lib/admin/appointments/createAdminAppointment'
import {
  getAvailableBookingPurposes,
  getBookingPurposeAdminLabel,
  getBookingPurposeCustomerLabel,
  getBookingPurposeDressMode,
  getInitialBookingPurpose,
  isBookingPurpose,
} from '@/lib/booking/purpose'
import { bookingSchema } from '@/lib/booking/validation'

const undecidedBooking = {
  customerName: 'Test Customer',
  date: '2099-01-02',
  email: 'test@example.com',
  phone: '+3530000000',
  purpose: 'undecided',
  time: '10:00',
} as const

describe('undecided booking purpose', () => {
  it('is a booking intent without becoming a catalogue mode', () => {
    expect(isBookingPurpose('undecided')).toBe(true)
    expect(getBookingPurposeDressMode('undecided')).toBeNull()
    expect(getBookingPurposeDressMode('buy')).toBe('buy')
    expect(getBookingPurposeDressMode('rent')).toBe('rent')
  })

  it('remains available when a selected dress is not currently buyable or rentable', () => {
    const selectedDress = { supportsBuy: false, supportsRent: false }

    expect(getAvailableBookingPurposes(selectedDress)).toEqual(['undecided'])
    expect(getInitialBookingPurpose('buy', selectedDress)).toBe('undecided')
    expect(getInitialBookingPurpose('undecided', selectedDress)).toBe('undecided')
  })

  it('normalizes public and admin labels without raw enum copy', () => {
    expect(getBookingPurposeCustomerLabel('undecided')).toBe('I’m not sure yet')
    expect(getBookingPurposeAdminLabel('undecided')).toBe('Undecided')
    expect(purposeOptions).toContainEqual(
      expect.objectContaining({ label: 'I’m not sure yet', value: 'undecided' }),
    )

    const markup = renderToStaticMarkup(
      <BookingSummary date="2 January 2099" purpose="undecided" time="10:00" />,
    )
    expect(markup).toContain('I’m not sure yet')
    expect(markup).not.toContain('>undecided<')
  })

  it('is accepted by public and admin validation', () => {
    expect(bookingSchema.safeParse(undecidedBooking).success).toBe(true)
    expect(
      createAdminAppointmentSchema.safeParse({
        ...undecidedBooking,
        initialStatus: 'pending',
      }).success,
    ).toBe(true)
  })
})
