import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  BookingCalendar,
  isBookingDateUnavailable,
} from '@/components/booking/booking-calendar'

describe('booking calendar', () => {
  it('marks past, closed, fully booked, and out-of-window dates unavailable', () => {
    const fullyBookedDates = new Set(['2026-07-22'])
    const check = (day: number) =>
      isBookingDateUnavailable({
        date: new Date(2026, 6, day, 12),
        fullyBookedDates,
        minDate: '2026-07-19',
        maxDate: '2026-09-16',
      })

    expect(check(18)).toBe(true)
    expect(check(19)).toBe(true)
    expect(check(20)).toBe(true)
    expect(check(21)).toBe(false)
    expect(check(22)).toBe(true)
  })

  it('does not select a fully booked date', () => {
    const onSelect = vi.fn()
    render(
      <BookingCalendar
        fullyBookedDates={['2026-07-22']}
        maxDate="2026-09-16"
        minDate="2026-07-19"
        onSelect={onSelect}
        selectedDate=""
      />,
    )

    const fullyBooked = screen.getByRole('button', { name: /Wednesday, July 22/i })
    expect(fullyBooked.hasAttribute('disabled')).toBe(true)
    fireEvent.click(fullyBooked)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('uses mobile-friendly 44px day and navigation targets without a native date input', () => {
    const { container } = render(
      <BookingCalendar
        fullyBookedDates={[]}
        maxDate="2026-09-16"
        minDate="2026-07-19"
        onSelect={() => undefined}
        selectedDate="2026-07-21"
      />,
    )

    expect(container.querySelector('input[type="date"]')).toBeNull()
    expect(container.querySelector('[data-day="2026-07-21"] button')?.className).toContain('size-11')
    expect(
      container.querySelector('button[aria-label="Go to next month"]')?.className,
    ).toContain('size-11')
  })
})
