import {
  publicBusinessAddress,
  publicBusinessLogoPath,
  publicBusinessSocialProfiles,
} from '@/config/business'
import { privacyContactEmail } from '@/config/privacy'
import { siteConfig } from '@/config/site'
import { getCanonicalOrigin } from '@/config/site-url'

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
  logo: string
  name: string
  sameAs: string[]
  url: string
}

export function buildLocalBusinessJsonLd(origin = getCanonicalOrigin()): LocalBusinessJsonLd {
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
    logo: new URL(publicBusinessLogoPath, `${origin}/`).toString(),
    name: siteConfig.name,
    sameAs: publicBusinessSocialProfiles.map(({ url }) => url),
    url: origin,
  }
}
