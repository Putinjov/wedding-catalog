import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BookingFlow } from '@/components/booking/booking-flow'
import { defaultBookingSettings } from '@/config/booking'

const mocks = vi.hoisted(() => ({
  getAvailableSlots: vi.fn(),
  getFullyBookedDates: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/book-a-fitting',
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/booking/booking-calendar', () => ({
  BookingCalendar: ({ onSelect }: { onSelect: (value: string) => void }) => (
    <button onClick={() => onSelect('2099-01-02')} type="button">
      Choose test date
    </button>
  ),
}))

vi.mock('@/lib/booking/getAvailableSlots', () => ({
  getAvailableSlots: mocks.getAvailableSlots,
}))

vi.mock('@/lib/booking/getFullyBookedDates', () => ({
  getFullyBookedDates: mocks.getFullyBookedDates,
}))

function renderFlow() {
  return render(
    <BookingFlow
      initialPurpose="buy"
      maxDate="2099-03-01"
      minDate="2099-01-01"
      selectedDress={null}
      settings={defaultBookingSettings}
    />,
  )
}

afterEach(cleanup)

describe('booking mobile presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
  })

  it('reserves mobile safe-area space and keeps the primary action reachable', () => {
    const { container } = renderFlow()
    const form = container.querySelector('form')
    const continueButton = screen.getByRole('button', { name: /continue to date and time/i })
    const actions = continueButton.parentElement

    expect(form?.className).toContain(
      'pb-[calc(7.5rem+env(safe-area-inset-bottom))]',
    )
    expect(form?.className).toContain('lg:pb-10')
    expect(actions?.className).toContain('fixed')
    expect(actions?.className).toContain('bottom-0')
    expect(actions?.className).toContain('safe-area-inset-left')
    expect(actions?.className).toContain('safe-area-inset-right')
    expect(actions?.className).toContain('safe-area-inset-bottom')
    expect(actions?.className).toContain('lg:static')
    expect(continueButton.className).toContain('col-span-2')
    expect(continueButton.className).toContain('h-11')
  })

  it('uses compact side-by-side actions and keyboard-safe field scroll margins', async () => {
    renderFlow()

    fireEvent.click(screen.getByRole('button', { name: /continue to date and time/i }))
    fireEvent.click(screen.getByRole('button', { name: /choose test date/i }))
    fireEvent.click(await screen.findByRole('button', { name: '10:00' }))
    fireEvent.click(screen.getByRole('button', { name: /continue to your details/i }))

    const backButton = screen.getByRole('button', { name: 'Back' })
    const continueButton = screen.getByRole('button', { name: /continue to review/i })
    expect(backButton.parentElement).toBe(continueButton.parentElement)
    expect(backButton.parentElement?.className).toContain(
      'grid-cols-[auto_minmax(0,1fr)]',
    )
    expect(backButton.className).toContain('min-h-11')
    expect(continueButton.className).not.toContain('col-span-2')

    for (const field of [
      screen.getByLabelText('Name'),
      screen.getByLabelText('Email'),
      screen.getByLabelText('Phone'),
      screen.getByLabelText(/Notes/),
    ]) {
      expect(field.className).toContain('safe-area-inset-bottom')
      expect(field.className).toContain('lg:scroll-mb-0')
    }
  })
})
