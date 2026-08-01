import { beforeEach, describe, expect, it, vi } from 'vitest'

import { metadata as bookingMetadata } from '@/app/(frontend)/book-a-fitting/page'
import { generateMetadata as generatePendingMetadata } from '@/app/(frontend)/book-a-fitting/pending/[reference]/page'
import { metadata as cancelledPaymentMetadata } from '@/app/(frontend)/book-a-fitting/payment/cancelled/page'
import { generateMetadata as generateSuccessPaymentMetadata } from '@/app/(frontend)/book-a-fitting/payment/success/page'
import { metadata as buyMetadata } from '@/app/(frontend)/buy/page'
import { generateMetadata as generateDressMetadata } from '@/app/(frontend)/dresses/[slug]/page'
import { metadata as dressesMetadata } from '@/app/(frontend)/dresses/page'
import { metadata as homeMetadata } from '@/app/(frontend)/page'
import { metadata as rentMetadata } from '@/app/(frontend)/rent/page'
import { getPrivateBookingHeaderRules } from '@/config/indexation'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
import type { DressWithMedia } from '@/lib/dress-media'
import { getDressBySlug } from '@/lib/getDress'

vi.mock('@/lib/booking/getAppointment', () => ({
  getAppointmentByReference: vi.fn(),
}))

vi.mock('@/lib/getDress', () => ({
  getDressBySlug: vi.fn(),
  getRelatedDresses: vi.fn(),
}))

vi.mock('@/components/booking/booking-flow', () => ({
  BookingFlow: () => null,
}))

vi.mock('@/components/booking/booking-summary', () => ({
  BookingSummary: () => null,
}))

vi.mock('@/components/booking/payment-button', () => ({
  PaymentButton: () => null,
}))

vi.mock('@/components/boutique/catalogue-page', () => ({
  CataloguePage: () => null,
}))

vi.mock('@/components/boutique/dress-detail', () => ({
  DressDetail: () => null,
}))

vi.mock('@/components/boutique/featured-dresses', () => ({
  FeaturedDresses: () => null,
}))

vi.mock('@/components/boutique/fitting-callout', () => ({
  FittingCallout: () => null,
}))

vi.mock('@/components/boutique/hero-section', () => ({
  HeroSection: () => null,
}))

vi.mock('@/components/boutique/journey-split', () => ({
  JourneySplit: () => null,
}))

vi.mock('@/components/boutique/newsletter-section', () => ({
  NewsletterSection: () => null,
}))

vi.mock('@/components/boutique/service-highlights', () => ({
  ServiceHighlights: () => null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: () => null,
}))

vi.mock('@/lib/getFeaturedDresses', () => ({
  getFeaturedDresses: vi.fn(),
}))

const privateRobotsMetadata = {
  follow: false,
  index: false,
  nocache: true,
}

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
    name: 'Example',
    publicVisibility: 'public',
    rentalStatus: 'available',
    saleStatus: 'available',
    sku: 'EXAMPLE-1',
    slug: 'example',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('canonical metadata', () => {
  beforeEach(() => {
    vi.mocked(getAppointmentByReference).mockReset()
    vi.mocked(getDressBySlug).mockReset()
  })

  it('defines a self-canonical on every primary public route', () => {
    expect(homeMetadata.alternates?.canonical).toBe('/')
    expect(dressesMetadata.alternates?.canonical).toBe('/dresses')
    expect(buyMetadata.alternates?.canonical).toBe('/buy')
    expect(rentMetadata.alternates?.canonical).toBe('/rent')
    expect(bookingMetadata.alternates?.canonical).toBe('/book-a-fitting')
  })

  it('uses the authoritative dress slug without catalogue mode parameters', async () => {
    vi.mocked(getDressBySlug).mockResolvedValue(dress())

    const metadata = await generateDressMetadata({
      params: Promise.resolve({ slug: 'requested-slug' }),
      searchParams: Promise.resolve({ mode: 'rent' }),
    })

    expect(getDressBySlug).toHaveBeenCalledWith('requested-slug')
    expect(metadata.alternates?.canonical).toBe('/dresses/example')
    expect(metadata.title).toEqual({ absolute: 'Example | CAIT Bridal' })
  })

  it('does not append the site name to an already branded dress title', async () => {
    vi.mocked(getDressBySlug).mockResolvedValue(
      dress({
        meta: {
          title: 'Editorial example | CAIT Bridal',
        },
      }),
    )

    const metadata = await generateDressMetadata({
      params: Promise.resolve({ slug: 'example' }),
      searchParams: Promise.resolve({}),
    })

    expect(metadata.title).toEqual({ absolute: 'Editorial example | CAIT Bridal' })
  })

  it('appends the site name once to an unbranded CMS dress title', async () => {
    vi.mocked(getDressBySlug).mockResolvedValue(
      dress({
        meta: {
          title: 'Editorial example',
        },
      }),
    )

    const metadata = await generateDressMetadata({
      params: Promise.resolve({ slug: 'example' }),
      searchParams: Promise.resolve({}),
    })

    expect(metadata.title).toEqual({ absolute: 'Editorial example | CAIT Bridal' })
  })
})

describe('private booking indexation', () => {
  it('exposes noindex and nofollow metadata on pending and payment pages', async () => {
    vi.mocked(getAppointmentByReference).mockResolvedValue(null)

    const pendingMetadata = await generatePendingMetadata({
      params: Promise.resolve({ reference: 'private-reference' }),
    })
    const successPaymentMetadata = await generateSuccessPaymentMetadata()

    expect(pendingMetadata.robots).toEqual(privateRobotsMetadata)
    expect(successPaymentMetadata.robots).toEqual(privateRobotsMetadata)
    expect(cancelledPaymentMetadata.robots).toEqual(privateRobotsMetadata)
  })

  it('adds HTTP noindex and no-store protection to private booking routes', async () => {
    expect(getPrivateBookingHeaderRules()).toEqual([
      {
        source: '/book-a-fitting/pending/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        source: '/book-a-fitting/payment/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ])
  })
})
