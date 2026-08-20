import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import HomePage from '@/app/(frontend)/page'
import { BoutiqueFooter } from '@/components/boutique/boutique-footer'
import { LocalBusinessJsonLd } from '@/components/seo/local-business-json-ld'
import {
  publicBusinessAddress,
  publicBusinessAddressLines,
  publicBusinessGeo,
  publicBusinessLogoPath,
  publicBusinessMapUrl,
  publicBusinessPhone,
  publicBusinessPhoneDisplay,
  publicBusinessSocialProfiles,
} from '@/config/business'
import { defaultBookingSettings } from '@/config/booking'
import { privacyContactEmail } from '@/config/privacy'
import { siteConfig } from '@/config/site'
import { buildLocalBusinessJsonLd } from '@/lib/local-business-json-ld'

vi.mock('@/lib/getFeaturedDresses', () => ({
  getFeaturedDresses: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/booking/settings', async () => {
  const { defaultBookingSettings: settings } = await import('@/config/booking')
  return { getBookingSettings: vi.fn().mockResolvedValue(settings) }
})

vi.mock('@/components/boutique/featured-dresses', () => ({ FeaturedDresses: () => null }))
vi.mock('@/components/boutique/fitting-callout', () => ({ FittingCallout: () => null }))
vi.mock('@/components/boutique/hero-section', () => ({ HeroSection: () => null }))
vi.mock('@/components/boutique/journey-split', () => ({ JourneySplit: () => null }))
vi.mock('@/components/boutique/newsletter-section', () => ({ NewsletterSection: () => null }))
vi.mock('@/components/boutique/service-highlights', () => ({ ServiceHighlights: () => null }))

afterEach(cleanup)

describe('LocalBusiness structured data', () => {
  it('builds a factual canonical ClothingStore without unverified claims', () => {
    const origin = 'https://caitbridal.ie'
    const jsonLd = buildLocalBusinessJsonLd(defaultBookingSettings, origin)

    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@id': 'https://caitbridal.ie/#business',
      '@type': 'ClothingStore',
      address: {
        '@type': 'PostalAddress',
        ...publicBusinessAddress,
      },
      description: `${siteConfig.tagline}. Handpicked gowns available to buy or rent.`,
      email: privacyContactEmail,
      geo: {
        '@type': 'GeoCoordinates',
        ...publicBusinessGeo,
      },
      hasMap: publicBusinessMapUrl,
      logo: `https://caitbridal.ie${publicBusinessLogoPath}`,
      name: siteConfig.name,
      openingHoursSpecification: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
        (day) => ({
          '@type': 'OpeningHoursSpecification',
          closes: '17:00',
          dayOfWeek: `https://schema.org/${day}`,
          opens: '10:00',
        }),
      ),
      sameAs: publicBusinessSocialProfiles.map(({ url }) => url),
      telephone: publicBusinessPhone,
      url: origin,
    })
    expect(jsonLd).not.toHaveProperty('aggregateRating')
    expect(jsonLd).not.toHaveProperty('priceRange')
    expect(jsonLd).not.toHaveProperty('review')
  })

  it('derives regular opening periods from the authoritative booking schedule', () => {
    const jsonLd = buildLocalBusinessJsonLd({
      ...defaultBookingSettings,
      closedWeekdays: [0, 1, 3, 4, 5, 6],
      lunchBreaks: [{ end: '13:00', start: '12:00', weekdays: [2] }],
      saturdayHours: { ...defaultBookingSettings.saturdayHours, enabled: false },
      weekdayHours: { end: '18:00', start: '09:00' },
    })

    expect(jsonLd.openingHoursSpecification).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        closes: '12:00',
        dayOfWeek: 'https://schema.org/Tuesday',
        opens: '09:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        closes: '18:00',
        dayOfWeek: 'https://schema.org/Tuesday',
        opens: '13:00',
      },
    ])
  })

  it('renders one parseable LocalBusiness JSON-LD script', () => {
    const { container } = render(
      <LocalBusinessJsonLd origin="https://caitbridal.ie" settings={defaultBookingSettings} />,
    )
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')

    expect(scripts).toHaveLength(1)
    expect(JSON.parse(scripts[0]?.textContent ?? '{}')).toMatchObject({
      '@id': 'https://caitbridal.ie/#business',
      '@type': 'ClothingStore',
      name: siteConfig.name,
    })
  })

  it('keeps every marked-up business detail visible in the public footer', () => {
    render(<BoutiqueFooter />)
    const jsonLd = buildLocalBusinessJsonLd(defaultBookingSettings, 'https://caitbridal.ie')

    expect(screen.getByRole('link', { name: siteConfig.name })).toBeTruthy()
    const emailLink = screen.getByRole('link', { name: privacyContactEmail })
    expect(emailLink.getAttribute('href')).toBe(`mailto:${privacyContactEmail}`)
    expect(emailLink.className).toContain('min-h-11')
    const phoneLink = screen.getByRole('link', { name: publicBusinessPhoneDisplay })
    expect(phoneLink.getAttribute('href')).toBe(`tel:${publicBusinessPhone}`)
    expect(phoneLink.className).toContain('min-h-11')
    expect(jsonLd.telephone).toBe(publicBusinessPhone)
    expect(
      screen
        .getByRole('link', { name: `View ${siteConfig.name} address on Google Maps` })
        .getAttribute('href'),
    ).toBe(publicBusinessMapUrl)
    for (const line of publicBusinessAddressLines) expect(screen.getByText(line)).toBeTruthy()
    for (const profile of publicBusinessSocialProfiles) {
      const socialLink = screen.getByRole('link', {
        name: `Visit ${siteConfig.name} on ${profile.label}`,
      })
      expect(socialLink.getAttribute('href')).toBe(profile.url)
      expect(socialLink.className).toContain('min-h-11')
      expect(jsonLd.sameAs).toContain(profile.url)
    }
  })

  it('includes the LocalBusiness component on the homepage only once', async () => {
    const { container } = render(await HomePage())
    const scripts = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => JSON.parse(script.textContent ?? '{}'))
      .filter((entry) => entry['@type'] === 'ClothingStore')

    expect(scripts).toHaveLength(1)
  })
})
