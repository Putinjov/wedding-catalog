import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BookingDialog } from '@/components/booking/booking-dialog'

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
}

describe('booking dialog', () => {
  beforeEach(() => {
    currentSearch = 'mode=rent'
    push.mockClear()
    replace.mockClear()
  })

  it('opens through URL state while preserving dress and Rent purpose', () => {
    const view = render(<BookingDialog {...props} />)
    fireEvent.click(screen.getByText('Book rent fitting'))

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
})
