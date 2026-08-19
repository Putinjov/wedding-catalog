import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BookingDialog } from '@/components/booking/booking-dialog'
import { defaultBookingSettings } from '@/config/booking'

let currentSearch = 'mode=rent'
const push = vi.fn()
const replace = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/dresses/test-dress',
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

vi.mock('@/components/booking/booking-flow', () => ({
  BookingFlow: (props: { initialPurpose: string; selectedDress: { slug: string } | null }) => (
    <div data-testid="booking-flow">
      {props.initialPurpose}:{props.selectedDress?.slug ?? 'generic'}
    </div>
  ),
}))

const props = {
  dialogID: 'dress-1-rent',
  fallbackHref: '/book-a-fitting?dress=test-dress&purpose=rent',
  initialPurpose: 'rent' as const,
  maxDate: '2026-09-16',
  minDate: '2026-07-19',
  primaryLabel: 'Book rent fitting',
  selectedDress: {
    id: 'dress-1',
    name: 'Test dress',
    slug: 'test-dress',
    supportsBuy: true,
    supportsRent: true,
  },
  settings: defaultBookingSettings,
}

afterEach(cleanup)

describe('booking dialog', () => {
  beforeEach(() => {
    currentSearch = 'mode=rent'
    push.mockClear()
    replace.mockClear()
  })

  it('opens through URL state while preserving dress and Rent purpose', () => {
    const view = render(<BookingDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Book rent fitting' }))

    expect(push).toHaveBeenCalledWith(
      '/dresses/test-dress?mode=rent&booking=dress-1-rent&purpose=rent&dress=test-dress',
      { scroll: false },
    )

    currentSearch = 'mode=rent&booking=dress-1-rent&purpose=rent&dress=test-dress'
    view.rerender(<BookingDialog {...props} />)
    expect(screen.getByTestId('booking-flow').textContent).toBe('rent:test-dress')
  })

  it('removes modal URL state when closed', () => {
    currentSearch = 'mode=rent&booking=dress-1-rent&purpose=rent&dress=test-dress'
    render(<BookingDialog {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close booking dialog' }))
    expect(replace).toHaveBeenCalledWith(
      '/dresses/test-dress?mode=rent&purpose=rent&dress=test-dress',
      { scroll: false },
    )
  })

  it('uses the dedicated booking page on mobile and keeps modal triggers desktop-only', () => {
    render(<BookingDialog {...props} mobileLabel="Mobile booking" />)

    const mobileLink = screen.getByRole('link', { name: 'Mobile booking' })
    expect(mobileLink.getAttribute('href')).toBe(
      '/book-a-fitting?dress=test-dress&purpose=rent',
    )
    expect(mobileLink.className).toContain('lg:hidden')

    const desktopTrigger = screen.getByRole('button', { name: 'Book rent fitting' })
    expect(desktopTrigger.className).toContain('hidden')
    expect(desktopTrigger.className).toContain('lg:inline-flex')
  })

  it('closes the desktop dialog on Escape and when browser history removes its URL state', () => {
    currentSearch = 'mode=rent&booking=dress-1-rent&purpose=rent&dress=test-dress'
    const view = render(<BookingDialog {...props} />)

    expect(screen.getByRole('dialog')).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(replace).toHaveBeenCalledWith(
      '/dresses/test-dress?mode=rent&purpose=rent&dress=test-dress',
      { scroll: false },
    )

    replace.mockClear()
    currentSearch = 'mode=rent'
    view.rerender(<BookingDialog {...props} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(replace).not.toHaveBeenCalled()
  })
})
