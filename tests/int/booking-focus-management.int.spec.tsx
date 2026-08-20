import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BookingFlow } from '@/components/booking/booking-flow'
import { defaultBookingSettings } from '@/config/booking'
import type { BookingActionResult } from '@/lib/booking/createAppointment'

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
    <div aria-label="Booking dialog" role="dialog">
      <BookingFlow
        initialPurpose="buy"
        maxDate="2099-03-01"
        minDate="2099-01-01"
        selectedDress={null}
        settings={defaultBookingSettings}
      />
    </div>,
  )
}

async function goToDetailsStep() {
  fireEvent.click(screen.getByRole('button', { name: /continue to date and time/i }))
  fireEvent.click(screen.getByRole('button', { name: /choose test date/i }))
  fireEvent.click(await screen.findByRole('button', { name: '10:00' }))
  fireEvent.click(screen.getByRole('button', { name: /continue to your details/i }))
  await screen.findByRole('heading', { name: 'Your details' })
}

function completeCustomerDetails() {
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

describe('booking focus management', () => {
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

  it('focuses and announces each new step while preserving modal containment', async () => {
    renderFlow()

    const firstProgressItem = screen.getByText('1. Purpose').closest('li')
    expect(firstProgressItem?.getAttribute('aria-current')).toBe('step')

    fireEvent.click(screen.getByRole('button', { name: /continue to date and time/i }))

    const heading = screen.getByRole('heading', { name: 'Choose a date and time' })
    await waitFor(() => expect(document.activeElement).toBe(heading))
    expect(screen.getByText('Step 2 of 4: Date and time.')).not.toBeNull()
    expect(screen.getByRole('dialog', { name: 'Booking dialog' }).contains(heading)).toBe(true)

    const back = screen.getByRole('button', { name: 'Back' })
    const continueButton = screen.getByRole('button', { name: /continue to your details/i })
    expect(back.compareDocumentPosition(continueButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(back.parentElement?.className).not.toContain('flex-col-reverse')

    fireEvent.click(screen.getByRole('button', { name: /choose test date/i }))
    fireEvent.click(await screen.findByRole('button', { name: '10:00' }))
    fireEvent.click(continueButton)

    const detailsHeading = screen.getByRole('heading', { name: 'Your details' })
    await waitFor(() => expect(document.activeElement).toBe(detailsHeading))
    expect(screen.getByText('Step 3 of 4: Your details.')).not.toBeNull()

    completeCustomerDetails()
    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }))

    const reviewHeading = screen.getByRole('heading', { name: 'Review your request' })
    await waitFor(() => expect(document.activeElement).toBe(reviewHeading))
    expect(screen.getByText('Step 4 of 4: Review.')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    const returnedDetailsHeading = screen.getByRole('heading', { name: 'Your details' })
    await waitFor(() => expect(document.activeElement).toBe(returnedDetailsHeading))
  })

  it('uses the same inline errors for local validation and focuses the first invalid field', async () => {
    renderFlow()
    await goToDetailsStep()

    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }))

    const name = screen.getByLabelText('Name')
    await waitFor(() => expect(document.activeElement).toBe(name))
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Please enter your name.', { selector: '#customer-name-error' })).not.toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('Please enter your name.')
    expect(screen.getByRole('heading', { name: 'Your details' })).not.toBeNull()
  })

  it('returns server field errors to the correct step and keeps focus inside the dialog', async () => {
    mocks.createPendingAppointment.mockResolvedValue({
      fieldErrors: { time: 'That fitting time has just been taken. Please choose another.' },
      message: 'That fitting time has just been taken. Please choose another.',
      success: false,
    } satisfies BookingActionResult)

    renderFlow()
    await goToDetailsStep()
    completeCustomerDetails()
    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm free appointment/i }))

    const timeField = await screen.findByRole('group', { name: 'Fitting time' })
    await waitFor(() => expect(document.activeElement).toBe(timeField))
    expect(screen.getByText('2. Date and time').closest('li')?.getAttribute('aria-current')).toBe(
      'step',
    )
    expect(timeField.getAttribute('aria-describedby')?.split(' ')).toEqual(
      expect.arrayContaining(['fitting-time-required', 'fitting-time-error']),
    )
    expect(
      screen.getAllByText('That fitting time has just been taken. Please choose another.'),
    ).toHaveLength(2)
    expect(screen.getByRole('dialog', { name: 'Booking dialog' }).contains(timeField)).toBe(true)
  })

  it('exposes the submitting state with aria-busy until navigation begins', async () => {
    let resolveBooking: (result: BookingActionResult) => void = () => undefined
    mocks.createPendingAppointment.mockReturnValue(
      new Promise<BookingActionResult>((resolve) => {
        resolveBooking = resolve
      }),
    )

    const { container } = renderFlow()
    await goToDetailsStep()
    completeCustomerDetails()
    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm free appointment/i }))

    const form = container.querySelector('form')
    await waitFor(() => expect(form?.getAttribute('aria-busy')).toBe('true'))
    expect(screen.getByRole('button', { name: /confirming your appointment/i }).hasAttribute('disabled')).toBe(
      true,
    )

    resolveBooking({ reference: `fit_${'a'.repeat(32)}`, success: true })
    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(`/book-a-fitting/pending/fit_${'a'.repeat(32)}`)
    })
  })

  it('replaces the review action before rendering the submit control', async () => {
    renderFlow()
    await goToDetailsStep()
    completeCustomerDetails()

    const reviewButton = screen.getByRole('button', { name: /continue to review/i })
    fireEvent.click(reviewButton)

    await screen.findByRole('heading', { name: 'Review your request' })
    const confirmationButton = screen.getByRole('button', { name: /confirm free appointment/i })
    expect(confirmationButton).not.toBe(reviewButton)
    expect(mocks.createPendingAppointment).not.toHaveBeenCalled()
  })
})
