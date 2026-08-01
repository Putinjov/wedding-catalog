import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DressCard } from '@/components/boutique/dress-card'
import type { DressWithMedia } from '@/lib/dress-media'

vi.mock('@/components/Media', () => ({
  Media: ({ alt }: { alt: string }) => <span aria-label={alt} />,
}))

afterEach(() => {
  cleanup()
})

function dress(overrides: Partial<DressWithMedia> = {}): DressWithMedia {
  return {
    id: 'dress-1',
    category: 'category-1',
    condition: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    designer: {
      id: 'designer-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      name: 'Atelier One',
      slug: 'atelier-one',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    displayOrder: 0,
    featured: true,
    mainImage: 'media-1',
    media: { gallery: [], main: null },
    name: 'Grace',
    previousSalePrice: 2200,
    publicVisibility: 'public',
    rentalPrice: 500,
    rentalStatus: 'available',
    salePrice: 1800,
    saleStatus: 'available',
    silhouette: {
      id: 'silhouette-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      name: 'A-line',
      slug: 'a-line',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    sku: 'INTERNAL-SKU',
    slug: 'grace',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('dress card content', () => {
  it('emphasizes Buy pricing and shows CMS-backed dress attributes without SKU', () => {
    render(<DressCard dress={dress()} mode="buy" />)

    expect(screen.getByText('Atelier One · A-line')).toBeTruthy()
    expect(screen.getByText('Available to buy')).toBeTruthy()
    expect(screen.getByText('Featured')).toBeTruthy()
    expect(screen.getByText('New')).toBeTruthy()
    expect(screen.getByText('€1,800.00')).toBeTruthy()
    expect(screen.getByText('€2,200.00')).toBeTruthy()
    expect(screen.getByText('View dress')).toBeTruthy()
    expect(screen.queryByText('INTERNAL-SKU')).toBeNull()
    expect(screen.queryByText(/Rent from/)).toBeNull()
  })

  it('uses mode-specific rental wording and hides sale pricing', () => {
    render(<DressCard dress={dress()} mode="rent" />)

    expect(screen.getByText('Available to rent')).toBeTruthy()
    expect(screen.getByText('Rent from €500.00')).toBeTruthy()
    expect(screen.queryByText('€1,800.00')).toBeNull()
    expect(screen.queryByText('€2,200.00')).toBeNull()
  })

  it('keeps a sold dress public while hiding its price and offering similar dresses', () => {
    render(
      <DressCard
        dress={dress({ rentalStatus: 'not-for-rent', salePrice: 1800, saleStatus: 'sold' })}
        mode="buy"
      />,
    )

    expect(screen.getByText('Sold')).toBeTruthy()
    expect(screen.queryByText('€1,800.00')).toBeNull()
    expect(screen.queryByText('View dress')).toBeNull()
    expect(screen.getByRole('link', { name: 'View similar dresses' }).getAttribute('href')).toBe(
      '/buy#catalogue-results',
    )
    expect(screen.getAllByRole('link')[0]?.getAttribute('href')).toBe(
      '/dresses/grace?mode=buy',
    )
  })
})
