import type { Metadata } from 'next'

import { publicNoIndexRobots } from '@/config/indexation'
import { siteConfig } from '@/config/site'
import {
  getCataloguePageURL,
  parseCataloguePage,
  type CatalogueMode,
  type CatalogueSearchParams,
} from '@/lib/catalogue'

function getCatalogueIndexation(
  mode: CatalogueMode,
  searchParams: CatalogueSearchParams,
): Pick<Metadata, 'alternates' | 'robots'> {
  const requestedPage = parseCataloguePage(searchParams.page)
  const hasNonPaginationParameters = Object.entries(searchParams).some(
    ([name, value]) => name !== 'page' && value !== undefined,
  )
  const hasInvalidPagination = searchParams.page !== undefined && requestedPage.shouldRedirect
  const shouldNoIndex = hasNonPaginationParameters || hasInvalidPagination
  const canonical =
    !shouldNoIndex && requestedPage.page > 1
      ? getCataloguePageURL({ mode, page: requestedPage.page, searchParams: {} })
      : `/${mode}`

  return {
    alternates: { canonical },
    robots: shouldNoIndex ? publicNoIndexRobots : undefined,
  }
}

export function getCatalogueMetadata(
  mode: CatalogueMode,
  searchParams: CatalogueSearchParams,
): Metadata {
  const isBuyMode = mode === 'buy'

  return {
    ...getCatalogueIndexation(mode, searchParams),
    description: isBuyMode
      ? `Explore wedding dresses available to purchase from ${siteConfig.name}.`
      : `Browse wedding dresses available to rent from ${siteConfig.name}.`,
    title: isBuyMode ? 'Buy wedding dresses' : 'Rent wedding dresses',
  }
}
