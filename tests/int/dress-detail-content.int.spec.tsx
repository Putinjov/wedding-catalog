import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DressPricePanel } from '@/components/boutique/dress-price-panel'
import type { Dress } from '@/payload-types'

vi.mock('@/components/booking/booking-dialog', () => ({
  BookingDialog: ({
    mobileLabel,
    primaryLabel,
    selectedDress,
  }: {
    mobileLabel?: string
    primaryLabel: string
    selectedDress: { supportsBuy: boolean; supportsRent: boolean }
  }) => (
    <div>
      <button>{primaryLabel}</button>
      {mobileLabel ? <button>{mobileLabel}</button> : null}
      <span data-testid="available-modes">
        {String(selectedDress.supportsBuy)}:{String(selectedDress.supportsRent)}
      </span>
    </div>
  ),
}))

afterEach(cleanup)

function dress(overrides: Partial<Dress> = {}): Dress {
  return {
    category: 'category-1',
    condition: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    displayOrder: 0,
    id: 'dress-1',
    mainImage: 'media-1',
    name: 'Grace',
    publicVisibility: 'public',
    rentalPrice: 500,
    rentalStatus: 'available',
    salePrice: 1800,
    saleStatus: 'available',
    securityDeposit: 200,
    sku: 'INTERNAL-SKU',
    slug: 'grace',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('dress detail commercial content', () => {
  it('shows only active Buy terms and matching desktop/mobile fitting actions', () => {
    render(<DressPricePanel dress={dress()} mode="buy" />)

    expect(screen.getByText('Purchase terms')).toBeTruthy()
    expect(screen.queryByText('Rental terms')).toBeNull()
    expect(screen.getAllByRole('button', { name: /Book a fitting/ })).toHaveLength(2)
    expect(screen.getByTestId('available-modes').textContent).toBe('true:true')
    expect(screen.queryByText('INTERNAL-SKU')).toBeNull()
  })

  it('renders a sold state without any misleading CTA', () => {
    render(<DressPricePanel dress={dress({ saleStatus: 'sold' })} mode="buy" />)

    expect(screen.getByText('Sold')).toBeTruthy()
    expect(screen.getByText('This dress has been sold and cannot be purchased.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText('€1,800.00')).toBeNull()
  })

  it('keeps unavailable modes out of the booking flow', () => {
    render(<DressPricePanel dress={dress({ saleStatus: 'sold' })} mode="rent" />)

    expect(screen.getByText('Rental terms')).toBeTruthy()
    expect(screen.getByTestId('available-modes').textContent).toBe('false:true')
  })
})
