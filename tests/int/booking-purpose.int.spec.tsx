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
  privacyAcknowledged: true,
  purpose: 'undecided',
  time: '10:00',
} as const

describe('undecided booking purpose', () => {
  it('keeps editorial card text balanced without duplicating the eyebrow and title', () => {
    expect(purposeOptions.map(({ title }) => title)).toEqual(['Buy', 'Rent', 'Follow-up'])
    expect(purposeOptions.map(({ eyebrow }) => eyebrow)).toEqual(['First appointment', 'First appointment', 'Returning bride'])
    for (const option of purposeOptions) {
      expect(option.description.length).toBeGreaterThan(45)
      expect(option.description.length).toBeLessThan(75)
      expect(option.description).not.toMatch(/verify|eligibility/i)
    }
  })
  it('is a booking intent without becoming a catalogue mode', () => {
    expect(isBookingPurpose('undecided')).toBe(true)
    expect(getBookingPurposeDressMode('undecided')).toBeNull()
    expect(getBookingPurposeDressMode('buy')).toBe('buy')
    expect(getBookingPurposeDressMode('rent')).toBe('rent')
  })

  it('remains available when a selected dress is not currently buyable or rentable', () => {
    const selectedDress = { supportsBuy: false, supportsRent: false }

    expect(getAvailableBookingPurposes(selectedDress)).toEqual(['follow_up'])
    expect(getInitialBookingPurpose('buy', selectedDress)).toBe('follow_up')
    expect(getInitialBookingPurpose('undecided', null)).toBe('buy')
    expect(getBookingPurposeDressMode('follow_up')).toBeNull()
  })

  it('normalizes public and admin labels without raw enum copy', () => {
    expect(getBookingPurposeCustomerLabel('undecided')).toBe('I’m not sure yet')
    expect(getBookingPurposeAdminLabel('undecided')).toBe('Undecided')
    expect(purposeOptions).toContainEqual(
      expect.objectContaining({ label: 'Follow-up appointment', value: 'follow_up' }),
    )
    expect(purposeOptions.some((option) => option.value === 'undecided')).toBe(false)
    expect(bookingSchema.safeParse({ ...undecidedBooking, purpose: 'follow_up' }).success).toBe(true)

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
        initialStatus: 'pending_payment',
        privacyNoticeMethod: 'phone',
      }).success,
    ).toBe(true)
  })
})
