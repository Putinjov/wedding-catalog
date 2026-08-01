import type { Metadata } from 'next'

import { siteConfig } from '@/config/site'
import type { CatalogueMode, CatalogueSearchParams } from '@/lib/catalogue'
import { hasCatalogueFilterParameters } from '@/lib/catalogue-filters'

export function getCatalogueMetadata(
  mode: CatalogueMode,
  searchParams: CatalogueSearchParams,
): Metadata {
  const isBuyMode = mode === 'buy'

  return {
    alternates: {
      canonical: `/${mode}`,
    },
    description: isBuyMode
      ? `Explore wedding dresses available to purchase from ${siteConfig.name}.`
      : `Browse wedding dresses available to rent from ${siteConfig.name}.`,
    robots: hasCatalogueFilterParameters(searchParams)
      ? {
          follow: true,
          index: false,
        }
      : undefined,
    title: isBuyMode ? 'Buy wedding dresses' : 'Rent wedding dresses',
  }
}
