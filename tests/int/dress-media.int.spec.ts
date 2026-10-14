import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { dressCardMediaSelect } from '@/lib/dress-card-query'
import { attachDressMedia, normalizeDressMedia } from '@/lib/dress-media'
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
    displayOrder: 0,
    name: 'Test dress',
    slug: 'test-dress',
    sku: 'TEST-1',
    category: 'category-1',
    condition: 'new',
    mainImage: 'media-1',
    publicVisibility: 'public',
    rentalStatus: 'not-for-rent',
    saleStatus: 'available',
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

  it('uses the card media projection when a main image needs a fallback lookup', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [media('media-1', '/api/media/file/media-1.webp')] })
    const payload = { find } as unknown as Payload

    const result = await attachDressMedia(
      [{ id: 'dress-1', mainImage: 'media-1', name: 'Grace' }],
      payload,
      { mediaSelect: dressCardMediaSelect },
    )

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        depth: 0,
        select: expect.objectContaining({ prefix: true }),
      }),
    )
    expect(result[0]?.media.main?.card.url).toBe('/api/media/file/media-1-medium.webp')
  })
})
