import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DressCard } from '@/components/boutique/dress-card'
import { RelatedDresses } from '@/components/boutique/related-dresses'
import type { DressDisplayMode } from '@/lib/catalogue'
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
    displayOrder: 0,
    mainImage: 'media-1',
    media: {
      gallery: [],
      main: null,
    },
    name: 'Test dress',
    publicVisibility: 'public',
    rentalStatus: 'available',
    saleStatus: 'available',
    sku: 'INTERNAL-TEST-SKU',
    slug: 'test-dress',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function getOnlyLinkHref(): string | null {
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(1)
  return links[0]?.getAttribute('href') ?? null
}

describe('catalogue mode dress links', () => {
  it.each<[DressDisplayMode, string]>([
    ['buy', '/dresses/test-dress?mode=buy'],
    ['rent', '/dresses/test-dress?mode=rent'],
    ['all', '/dresses/test-dress'],
  ])('uses the %s mode in dress card links', (mode, expectedHref) => {
    render(<DressCard dress={dress()} mode={mode} />)

    expect(getOnlyLinkHref()).toBe(expectedHref)
  })

  it('retains the current mode in related dress cards', () => {
    render(
      <RelatedDresses
        dresses={[dress()]}
        mode="rent"
        returnTo="/rent?designer=atelier-one&page=2#catalogue-results"
      />,
    )

    expect(getOnlyLinkHref()).toBe(
      '/dresses/test-dress?mode=rent&returnTo=%2Frent%3Fdesigner%3Datelier-one%26page%3D2%23catalogue-results&source=related',
    )
    expect(screen.getByRole('link').getAttribute('data-attribution')).toBe('related')
  })

  it('retains normalized catalogue context in a dress-card link', () => {
    render(
      <DressCard
        dress={dress()}
        mode="buy"
        returnTo="/buy?silhouette=a-line&page=2#catalogue-results"
      />,
    )

    expect(getOnlyLinkHref()).toBe(
      '/dresses/test-dress?mode=buy&returnTo=%2Fbuy%3Fsilhouette%3Da-line%26page%3D2%23catalogue-results',
    )
  })

  it('encodes the authoritative dress slug before adding the mode', () => {
    render(<DressCard dress={dress({ slug: 'test dress & veil' })} mode="buy" />)

    expect(getOnlyLinkHref()).toBe('/dresses/test%20dress%20%26%20veil?mode=buy')
  })
})
