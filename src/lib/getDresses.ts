import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload, type PaginatedDocs, type Where } from 'payload'

import {
  CATALOGUE_PAGE_SIZE,
  DEFAULT_CATALOGUE_SORT,
  catalogueSortOptions,
  getCatalogueDressSort,
  type CatalogueMode,
  type CatalogueSort,
} from '@/lib/catalogue'
import {
  buildCatalogueFilterConditions,
  type CatalogueFilterOptions,
  type CatalogueFilterValues,
} from '@/lib/catalogue-filters'
import { dressCardMediaSelect, dressCardPopulate, dressCardSelect, type DressCardRecord } from '@/lib/dress-card-query'
import { attachDressMedia, type DressCardWithMedia } from '@/lib/dress-media'
import { getCatalogueCacheTags } from '@/lib/dress-cache'
import { buildPublicDressWhere } from '@/lib/public-dress-filters'

// This is a cache admission limit, not a limit on catalogue navigation.
export const MAX_CACHED_CATALOGUE_PAGE = 100

const cacheableSorts = new Set<CatalogueSort>(catalogueSortOptions.map(({ value }) => value))

type CatalogueQuery = {
  filterConditions: Where[]
  page: number
  sort: CatalogueSort
}

async function queryDresses(
  mode: CatalogueMode,
  { filterConditions, page, sort }: CatalogueQuery,
): Promise<PaginatedDocs<DressCardWithMedia>> {
  const payload = await getPayload({
    config: configPromise,
  })

  const result = await payload.find({
    collection: 'dresses',
    depth: 1,
    draft: false,
    limit: CATALOGUE_PAGE_SIZE,
    overrideAccess: false,
    page,
    populate: dressCardPopulate,
    select: dressCardSelect,
    sort: getCatalogueDressSort(mode, sort),
    where: buildPublicDressWhere({ availability: 'available', mode }, filterConditions),
  })

  const docs = await attachDressMedia(result.docs as DressCardRecord[], payload, {
    mediaSelect: dressCardMediaSelect,
  })

  return { ...result, docs }
}

const cachedCatalogueQueries: Record<
  CatalogueMode,
  (query: CatalogueQuery) => Promise<PaginatedDocs<DressCardWithMedia>>
> = {
  buy: unstable_cache((query: CatalogueQuery) => queryDresses('buy', query), ['catalogue-v2', 'buy'], {
    revalidate: 300,
    tags: getCatalogueCacheTags('buy'),
  }),
  rent: unstable_cache(
    (query: CatalogueQuery) => queryDresses('rent', query),
    ['catalogue-v2', 'rent'],
    {
      revalidate: 300,
      tags: getCatalogueCacheTags('rent'),
    },
  ),
}

export function isCatalogueQueryCacheable({
  draft = false,
  filters,
  page,
  sort = DEFAULT_CATALOGUE_SORT,
}: {
  draft?: boolean
  filters?: CatalogueFilterValues
  page: number
  sort?: CatalogueSort
}): boolean {
  const hasCacheablePriceRange =
    filters === undefined || (filters.priceMin === null && filters.priceMax === null)

  // Free-form prices and large pages stay functional without creating cache entries.
  return (
    !draft &&
    Number.isSafeInteger(page) &&
    page > 0 &&
    page <= MAX_CACHED_CATALOGUE_PAGE &&
    cacheableSorts.has(sort) &&
    hasCacheablePriceRange
  )
}

export async function getDresses(
  mode: CatalogueMode,
  {
    filterOptions,
    filters,
    draft = false,
    page = 1,
    sort = DEFAULT_CATALOGUE_SORT,
  }: {
    draft?: boolean
    filterOptions?: CatalogueFilterOptions
    filters?: CatalogueFilterValues
    page?: number
    sort?: CatalogueSort
  } = {},
): Promise<PaginatedDocs<DressCardWithMedia>> {
  const filterConditions =
    filters && filterOptions ? buildCatalogueFilterConditions(mode, filters, filterOptions) : []
  const query = {
    filterConditions,
    page,
    sort,
  }

  if (isCatalogueQueryCacheable({ draft, filters, page, sort })) {
    return cachedCatalogueQueries[mode](query)
  }

  return queryDresses(mode, query)
}
