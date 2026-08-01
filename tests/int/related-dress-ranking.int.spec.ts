import { describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

import { rankRelatedDresses } from '@/lib/getDress'
import type { Dress } from '@/payload-types'

function dress(id: string, overrides: Partial<Dress> = {}): Dress {
  return {
    category: 'other-category',
    condition: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    displayOrder: 0,
    id,
    mainImage: 'media-1',
    name: id,
    publicVisibility: 'public',
    rentalStatus: 'available',
    salePrice: 1400,
    saleStatus: 'available',
    sku: `SKU-${id}`,
    slug: id,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('related dress ranking', () => {
  it('uses the required ranking tiers and deterministic tie-breakers', () => {
    const candidates = [
      dress('fallback'),
      dress('featured-fallback', { featured: true, salePrice: undefined }),
      dress('similar-price', { salePrice: 1050 }),
      dress('designer', { designer: 'designer-1', salePrice: 1800 }),
      dress('silhouette', { salePrice: 2000, silhouette: 'silhouette-1' }),
      dress('both', { category: 'category-1', salePrice: 2200, silhouette: 'silhouette-1' }),
      dress('current', { category: 'category-1', silhouette: 'silhouette-1' }),
    ]

    expect(
      rankRelatedDresses(
        candidates,
        {
          categoryId: 'category-1',
          designerId: 'designer-1',
          id: 'current',
          mode: 'buy',
          price: 1000,
          silhouetteId: 'silhouette-1',
        },
        6,
      ).map(({ id }) => id),
    ).toEqual([
      'both',
      'silhouette',
      'designer',
      'similar-price',
      'fallback',
      'featured-fallback',
    ])
  })

  it('uses mode-specific price distance', () => {
    const ranked = rankRelatedDresses(
      [
        dress('sale-close', { rentalPrice: 900, salePrice: 100 }),
        dress('rent-close', { rentalPrice: 510, salePrice: 2000 }),
      ],
      {
        categoryId: null,
        designerId: null,
        id: 'current',
        mode: 'rent',
        price: 500,
        silhouetteId: null,
      },
    )

    expect(ranked.map(({ id }) => id)).toEqual(['rent-close', 'sale-close'])
  })
})
