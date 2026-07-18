import { describe, expect, it } from 'vitest'

import { normalizeDressMedia } from '@/lib/dress-media'
import type { Dress, Media } from '@/payload-types'

function media(id: string, url: string): Media {
  return {
    id,
    alt: `Alt ${id}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    height: 1200,
    sizes: {
      medium: { height: 900, url: `/api/media/file/${id}-medium.webp`, width: 675 },
      thumbnail: { height: 300, url: `/api/media/file/${id}-thumb.webp`, width: 225 },
    },
    updatedAt: '2026-01-01T00:00:00.000Z',
    url,
    width: 900,
  }
}

function dress(overrides: Partial<Dress> = {}): Dress {
  return {
    id: 'dress-1',
    name: 'Test dress',
    slug: 'test-dress',
    sku: 'TEST-1',
    category: 'category-1',
    condition: 'new',
    availabilityStatus: 'available',
    mainImage: 'media-1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('dress media normalization', () => {
  it('resolves one unpopulated image ID and selects responsive sizes', () => {
    const first = media('media-1', '/api/media/file/media-1.webp')
    const result = normalizeDressMedia(dress(), new Map([[first.id, first]]))

    expect(result.main?.full.url).toBe('/api/media/file/media-1-medium.webp')
    expect(result.main?.thumbnail.url).toBe('/api/media/file/media-1-thumb.webp')
    expect(result.gallery).toHaveLength(1)
  })

  it('keeps the main image and every unique gallery image', () => {
    const first = media('media-1', '/api/media/file/media-1.webp')
    const second = media('media-2', '/api/media/file/media-2.webp')
    const result = normalizeDressMedia(
      dress({ mainImage: first, gallery: [{ image: second }, { image: first }] }),
    )

    expect(result.gallery.map((image) => image.full.id)).toEqual(['media-1', 'media-2'])
  })

  it('returns an empty model only when no image can be resolved', () => {
    const result = normalizeDressMedia(dress({ mainImage: 'missing', gallery: [] }))

    expect(result.main).toBeNull()
    expect(result.gallery).toEqual([])
  })
})
