import {
  publicBusinessAddress,
  publicBusinessGeo,
  publicBusinessLogoPath,
  publicBusinessMapUrl,
  publicBusinessPhone,
  publicBusinessSocialProfiles,
} from '@/config/business'
import type { ResolvedBookingSettings } from '@/config/booking'
import { privacyContactEmail } from '@/config/privacy'
import { siteConfig } from '@/config/site'
import { getCanonicalOrigin } from '@/config/site-url'
import { getBusinessOpeningDays } from '@/lib/business-opening-hours'

type OpeningHoursSpecification = {
  '@type': 'OpeningHoursSpecification'
  closes: string
  dayOfWeek: string
  opens: string
}

export type LocalBusinessJsonLd = {
  '@context': 'https://schema.org'
  '@id': string
  '@type': 'ClothingStore'
  address: {
    '@type': 'PostalAddress'
    addressCountry: string
    addressLocality: string
    addressRegion: string
    postalCode: string
    streetAddress: string
  }
  description: string
  email: string
  geo: {
    '@type': 'GeoCoordinates'
    latitude: number
    longitude: number
  }
  hasMap: string
  logo: string
  name: string
  openingHoursSpecification?: OpeningHoursSpecification[]
  sameAs: string[]
  telephone: string
  url: string
}

export function buildLocalBusinessJsonLd(
  settings: ResolvedBookingSettings,
  origin = getCanonicalOrigin(),
): LocalBusinessJsonLd {
  const openingHoursSpecification = getBusinessOpeningDays(settings).flatMap((day) =>
    day.periods.map((period) => ({
      '@type': 'OpeningHoursSpecification' as const,
      closes: period.end,
      dayOfWeek: day.dayOfWeek,
      opens: period.start,
    })),
  )

  return {
    '@context': 'https://schema.org',
    '@id': `${origin}/#business`,
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
    logo: new URL(publicBusinessLogoPath, `${origin}/`).toString(),
    name: siteConfig.name,
    ...(openingHoursSpecification.length > 0 ? { openingHoursSpecification } : {}),
    sameAs: publicBusinessSocialProfiles.map(({ url }) => url),
    telephone: publicBusinessPhone,
    url: origin,
  }
}
