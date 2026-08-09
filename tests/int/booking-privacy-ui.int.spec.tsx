import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BookingFlow } from '@/components/booking/booking-flow'
import { defaultBookingSettings } from '@/config/booking'
import { currentPrivacyPolicy } from '@/config/privacy'

const mocks = vi.hoisted(() => ({
  createPendingAppointment: vi.fn(),
  getAvailableSlots: vi.fn(),
  getFullyBookedDates: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/book-a-fitting',
  useRouter: () => ({ push: vi.fn(), replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/booking/booking-calendar', () => ({
  BookingCalendar: ({ onSelect }: { onSelect: (value: string) => void }) => (
    <button onClick={() => onSelect('2099-01-02')} type="button">
      Choose test date
    </button>
  ),
}))

vi.mock('@/lib/booking/createAppointment', () => ({
  createPendingAppointment: mocks.createPendingAppointment,
}))

vi.mock('@/lib/booking/getAvailableSlots', () => ({
  getAvailableSlots: mocks.getAvailableSlots,
}))

vi.mock('@/lib/booking/getFullyBookedDates', () => ({
  getFullyBookedDates: mocks.getFullyBookedDates,
}))

describe('booking privacy UI', () => {
  it('keeps required acknowledgement separate from optional email marketing', async () => {
    mocks.getFullyBookedDates.mockResolvedValue({ dates: [], success: true })
    mocks.getAvailableSlots.mockResolvedValue({
      slots: [
        {
          endAt: '2099-01-02T11:00:00.000Z',
          label: '10:00',
          startAt: '2099-01-02T10:00:00.000Z',
        },
      ],
      success: true,
    })

    render(
      <BookingFlow
        initialPurpose="buy"
        maxDate="2099-03-01"
        minDate="2099-01-01"
        selectedDress={null}
        settings={defaultBookingSettings}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /continue to date and time/i }))
    fireEvent.click(screen.getByRole('button', { name: /choose test date/i }))
    fireEvent.click(await screen.findByRole('button', { name: '10:00' }))
    fireEvent.click(screen.getByRole('button', { name: /continue to your details/i }))

    const acknowledgement = screen.getByRole('checkbox', {
      name: /i confirm that i have read the privacy policy/i,
    }) as HTMLInputElement
    const marketing = screen.getByRole('checkbox', {
      name: /occasional news and offers by email/i,
    }) as HTMLInputElement

    expect(acknowledgement.checked).toBe(false)
    expect(marketing.checked).toBe(false)
    expect(acknowledgement.closest('label')?.className).toContain('min-h-11')
    expect(marketing.closest('label')?.className).toContain('min-h-11')
    expect(
      screen.getAllByRole('link', { name: 'Privacy Policy' })[0].getAttribute('href'),
    ).toBe(currentPrivacyPolicy.policyPath)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Customer' } })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'customer@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+353100000000' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }))

    expect(screen.getByRole('alert').textContent).toContain(
      'Please confirm that you have read the Privacy Policy.',
    )
    expect(screen.getByRole('heading', { name: 'Your details' })).not.toBeNull()

    fireEvent.click(acknowledgement)
    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Review your request' })).not.toBeNull()
    })
    expect(marketing.checked).toBe(false)
  })
})
