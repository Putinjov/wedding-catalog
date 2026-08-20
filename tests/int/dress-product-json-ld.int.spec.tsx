import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DressProductJsonLd } from '@/components/boutique/dress-product-json-ld'
import type { DressMediaImage, DressWithMedia } from '@/lib/dress-media'
import { buildDressProductJsonLd } from '@/lib/dress-product-json-ld'
import type { Designer, Media } from '@/payload-types'

const origin = 'https://caitbridal.ie'

afterEach(cleanup)

function media(id: string, url: string, mimeType = 'image/webp'): Media {
  return {
    alt: `${id} alt`,
    createdAt: '2026-01-01T00:00:00.000Z',
    height: 1200,
    id,
    mimeType,
    updatedAt: '2026-01-01T00:00:00.000Z',
    url,
    width: 900,
  }
}

function image(id: string, url: string, mimeType?: string): DressMediaImage {
  const resource = media(id, url, mimeType)

  return {
    alt: resource.alt ?? '',
    card: resource,
    full: resource,
    thumbnail: resource,
  }
}

function designer(): Designer {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    id: 'designer-1',
    name: 'Atelier One',
    slug: 'atelier-one',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function dress(overrides: Partial<DressWithMedia> = {}): DressWithMedia {
  const main = image('media-1', '/api/media/file/grace.webp')

  return {
    category: 'category-1',
    condition: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    designer: designer(),
    displayOrder: 0,
    id: 'dress-1',
    mainImage: 'media-1',
    media: {
      gallery: [
        main,
        image('media-2', 'https://media.caitbridal.ie/grace-detail.webp'),
        image('media-video', 'https://media.caitbridal.ie/grace-video.mp4', 'video/mp4'),
        image('media-3', '/api/media/file/grace.webp'),
      ],
      main,
    },
    name: 'Grace',
    publicVisibility: 'public',
    rentalPrice: 500,
    rentalStatus: 'available',
    salePrice: 1800,
    saleStatus: 'available',
    shortDescription: 'Silk bridal gown with a clean column silhouette.',
    sku: ' INTERNAL-SKU ',
    slug: 'grace',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('dress Product JSON-LD', () => {
  it('builds a canonical sale Product with factual brand, images, SKU, and InStock Offer', () => {
    const jsonLd = buildDressProductJsonLd(dress(), origin)

    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      brand: {
        '@type': 'Brand',
        name: 'Atelier One',
      },
      description: 'Silk bridal gown with a clean column silhouette.',
      image: [
        'https://caitbridal.ie/api/media/file/grace.webp',
        'https://media.caitbridal.ie/grace-detail.webp',
      ],
      name: 'Grace',
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        price: 1800,
        priceCurrency: 'EUR',
        url: 'https://caitbridal.ie/dresses/grace',
      },
      sku: 'INTERNAL-SKU',
      url: 'https://caitbridal.ie/dresses/grace',
    })
    expect(jsonLd).not.toHaveProperty('review')
    expect(jsonLd).not.toHaveProperty('aggregateRating')
    expect(jsonLd).not.toHaveProperty('rentalPrice')
  })

  it.each(['reserved', 'sold'] as const)(
    'marks a %s sale dress OutOfStock while retaining its factual sale price',
    (saleStatus) => {
      const jsonLd = buildDressProductJsonLd(dress({ saleStatus }), origin)

      expect(jsonLd.offers).toMatchObject({
        availability: 'https://schema.org/OutOfStock',
        price: 1800,
      })
    },
  )

  it('omits Offer for a rental-only dress instead of presenting rental pricing as a sale', () => {
    const jsonLd = buildDressProductJsonLd(
      dress({
        rentalPrice: 500,
        rentalStatus: 'available',
        salePrice: null,
        saleStatus: 'not-for-sale',
      }),
      origin,
    )

    expect(jsonLd).not.toHaveProperty('offers')
    expect(JSON.stringify(jsonLd)).not.toContain('rentalPrice')
  })

  it('omits Offer when a sale price is missing or invalid', () => {
    expect(
      buildDressProductJsonLd(dress({ salePrice: null, salePriceOnRequest: true }), origin),
    ).not.toHaveProperty('offers')
    expect(buildDressProductJsonLd(dress({ salePrice: 0 }), origin)).not.toHaveProperty('offers')
  })

  it('omits unpopulated optional claims and unusable image URLs', () => {
    const jsonLd = buildDressProductJsonLd(
      dress({
        designer: 'designer-1',
        media: {
          gallery: [image('media-1', 'javascript:alert(1)')],
          main: null,
        },
        sku: ' ',
      }),
      origin,
    )

    expect(jsonLd).not.toHaveProperty('brand')
    expect(jsonLd).not.toHaveProperty('image')
    expect(jsonLd).not.toHaveProperty('sku')
  })

  it('escapes markup while preserving the original data after JSON parsing', () => {
    const hostileName = '</script><script>alert("structured-data")</script>'
    const { container } = render(
      <DressProductJsonLd dress={dress({ name: hostileName, shortDescription: hostileName })} />,
    )
    const script = container.querySelector('script[type="application/ld+json"]')

    expect(script).toBeTruthy()
    expect(script?.textContent).not.toContain('</script>')
    expect(JSON.parse(script?.textContent ?? '{}')).toMatchObject({
      description: hostileName,
      name: hostileName,
    })
  })
})
