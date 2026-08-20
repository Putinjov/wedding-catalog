import { siteConfig } from '@/config/site'
import { getCanonicalOrigin } from '@/config/site-url'
import type { DressWithMedia } from '@/lib/dress-media'
import { getRelationshipLabel } from '@/lib/dress-utils'
import type { Media } from '@/payload-types'
import { getDressPath } from '@/utilities/dress-routing'

type ProductAvailability = 'https://schema.org/InStock' | 'https://schema.org/OutOfStock'

type ProductOffer = {
  '@type': 'Offer'
  availability: ProductAvailability
  price: number
  priceCurrency: typeof siteConfig.currency
  url: string
}

export type DressProductJsonLd = {
  '@context': 'https://schema.org'
  '@type': 'Product'
  brand?: {
    '@type': 'Brand'
    name: string
  }
  description: string
  image?: string[]
  name: string
  offers?: ProductOffer
  sku?: string
  url: string
}

export function getDressProductDescription(dress: DressWithMedia): string {
  const description = dress.shortDescription?.trim() || dress.meta?.description?.trim()
  return description || `${dress.name} from ${siteConfig.name}.`
}

function normalizeProductImageURL(resource: Media, origin: string): string | null {
  const value = resource.url
  if (!value) return null

  let url: URL
  try {
    url = new URL(value, origin)
  } catch {
    return null
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null

  const isImage = resource.mimeType
    ? resource.mimeType.startsWith('image/')
    : /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname)
  if (!isImage) return null

  return url.toString()
}

function getProductImages(dress: DressWithMedia, origin: string): string[] {
  return [
    ...new Set(
      dress.media.gallery.flatMap(({ full }) => {
        const url = normalizeProductImageURL(full, origin)
        return url ? [url] : []
      }),
    ),
  ]
}

function getSaleOffer(dress: DressWithMedia, canonicalURL: string): ProductOffer | undefined {
  if (
    dress.saleStatus === 'not-for-sale' ||
    typeof dress.salePrice !== 'number' ||
    !Number.isFinite(dress.salePrice) ||
    dress.salePrice <= 0
  ) {
    return undefined
  }

  return {
    '@type': 'Offer',
    availability:
      dress.saleStatus === 'available'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    price: dress.salePrice,
    priceCurrency: siteConfig.currency,
    url: canonicalURL,
  }
}

export function buildDressProductJsonLd(
  dress: DressWithMedia,
  origin = getCanonicalOrigin(),
): DressProductJsonLd {
  const canonicalURL = `${origin}${getDressPath(dress.slug)}`
  const designer = getRelationshipLabel(dress.designer)
  const images = getProductImages(dress, origin)
  const offer = getSaleOffer(dress, canonicalURL)
  const sku = dress.sku.trim()

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    ...(designer
      ? {
          brand: {
            '@type': 'Brand' as const,
            name: designer,
          },
        }
      : {}),
    description: getDressProductDescription(dress),
    ...(images.length > 0 ? { image: images } : {}),
    name: dress.name,
    ...(offer ? { offers: offer } : {}),
    ...(sku ? { sku } : {}),
    url: canonicalURL,
  }
}
