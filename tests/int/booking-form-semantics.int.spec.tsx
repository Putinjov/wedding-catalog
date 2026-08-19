import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BookingFlow } from '@/components/booking/booking-flow'
import { defaultBookingSettings } from '@/config/booking'
import type { BookingActionResult } from '@/lib/booking/createAppointment'
import { bookingNotesMaxLength } from '@/lib/booking/validation'

const mocks = vi.hoisted(() => ({
  createPendingAppointment: vi.fn(),
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

vi.mock('@/lib/booking/createAppointment', () => ({
  createPendingAppointment: mocks.createPendingAppointment,
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

async function goToDetailsStep() {
  fireEvent.click(screen.getByRole('button', { name: /continue to date and time/i }))
  fireEvent.click(screen.getByRole('button', { name: /choose test date/i }))
  fireEvent.click(await screen.findByRole('button', { name: '10:00' }))
  fireEvent.click(screen.getByRole('button', { name: /continue to your details/i }))
  await screen.findByRole('heading', { name: 'Your details' })
}

function completeRequiredDetails() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Customer' } })
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'customer@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+353100000000' } })
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: /i confirm that i have read the privacy policy/i,
    }),
  )
}

afterEach(cleanup)

describe('booking form semantics', () => {
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

  it('exposes mobile autofill, required state, optional guidance, and a live notes count', async () => {
    const { container } = renderFlow()
    await goToDetailsStep()

    const name = screen.getByLabelText('Name')
    const email = screen.getByLabelText('Email')
    const phone = screen.getByLabelText('Phone')
    const notes = screen.getByLabelText(/Notes/)
    const privacy = screen.getByRole('checkbox', {
      name: /i confirm that i have read the privacy policy/i,
    })
    const marketing = screen.getByRole('checkbox', {
      name: /occasional news and offers by email/i,
    })

    expect(container.querySelector('form')?.getAttribute('autocomplete')).toBe('on')
    expect(name.getAttribute('autocomplete')).toBe('name')
    expect(name.getAttribute('name')).toBe('name')
    expect(name.hasAttribute('required')).toBe(true)
    expect(name.className).toContain('min-h-11')
    expect(email.getAttribute('autocomplete')).toBe('email')
    expect(email.getAttribute('inputmode')).toBe('email')
    expect(email.getAttribute('name')).toBe('email')
    expect(email.hasAttribute('required')).toBe(true)
    expect(email.className).toContain('min-h-11')
    expect(phone.getAttribute('autocomplete')).toBe('tel')
    expect(phone.getAttribute('inputmode')).toBe('tel')
    expect(phone.getAttribute('name')).toBe('tel')
    expect(phone.hasAttribute('required')).toBe(true)
    expect(phone.className).toContain('min-h-11')
    expect(privacy.hasAttribute('required')).toBe(true)
    expect(marketing.hasAttribute('required')).toBe(false)
    expect(screen.getByText(/notes and marketing emails are optional/i)).not.toBeNull()

    expect(notes.getAttribute('maxlength')).toBe(String(bookingNotesMaxLength))
    expect(notes.getAttribute('aria-describedby')).toBe(
      'customer-notes-help customer-notes-count',
    )
    const count = screen.getByText(`0 of ${bookingNotesMaxLength} characters used`)
    expect(count.getAttribute('role')).toBe('status')
    expect(count.getAttribute('aria-live')).toBe('polite')

    fireEvent.change(notes, { target: { value: 'Dress notes' } })
    expect(screen.getByText(`11 of ${bookingNotesMaxLength} characters used`)).not.toBeNull()
  })

  it('uses the same described error presentation for local and server validation', async () => {
    mocks.createPendingAppointment.mockResolvedValue({
      fieldErrors: { email: 'Please enter a different email address.' },
      message: 'Please check the highlighted details.',
      success: false,
    } satisfies BookingActionResult)

    renderFlow()
    await goToDetailsStep()
    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }))

    const name = screen.getByLabelText('Name')
    const localError = document.getElementById('customer-name-error')
    expect(name.getAttribute('aria-describedby')).toBe('customer-name-error')
    expect(localError?.className).toContain('text-destructive')

    completeRequiredDetails()
    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    const email = await screen.findByLabelText('Email')
    await waitFor(() => expect(document.activeElement).toBe(email))
    const serverError = document.getElementById('customer-email-error')
    expect(email.getAttribute('aria-describedby')).toBe('customer-email-error')
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(serverError?.className).toBe(localError?.className)
    expect(serverError?.textContent).toBe('Please enter a different email address.')
  })
})
