import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BookingCalendar } from '@/components/booking/booking-calendar'
import { defaultBookingSettings } from '@/config/booking'
import { resolveBookingSettings } from '@/lib/booking/settings'
import { updatedFittingSchedule } from '@/migrations/20260909_213000_update_fitting_schedule'

afterEach(cleanup)

describe('calendar after fitting schedule migration', () => {
  it('allows Sunday/Monday selection and disables Tuesday/Thursday', () => {
    const onSelect = vi.fn()
    render(
      <BookingCalendar
        fullyBookedDates={[]}
        maxDate="2026-10-10"
        minDate="2026-09-11"
        onSelect={onSelect}
        selectedDate=""
        settings={resolveBookingSettings({ ...defaultBookingSettings, ...updatedFittingSchedule })}
      />,
    )
    for (const [label, date] of [
      [/Sunday, September 13/i, '2026-09-13'],
      [/Monday, September 14/i, '2026-09-14'],
    ] as const) {
      const button = screen.getByRole('button', { name: label })
      expect(button.hasAttribute('disabled')).toBe(false)
      fireEvent.click(button)
      expect(onSelect).toHaveBeenLastCalledWith(date)
    }
    for (const label of [/Tuesday, September 15/i, /Thursday, September 17/i]) {
      const button = screen.getByRole('button', { name: label })
      expect(button.hasAttribute('disabled')).toBe(true)
      fireEvent.click(button)
    }
    expect(onSelect).toHaveBeenCalledTimes(2)
  })
})
