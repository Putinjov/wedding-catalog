import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import type { CatalogueFilterOption, CatalogueFilterOptions } from '@/lib/catalogue-filters'
import { CATALOGUE_FILTER_OPTIONS_CACHE_TAG } from '@/lib/dress-cache'

const LOOKUP_LIMIT = 200

function toOption(document: { id: string; name: string; slug: string }): CatalogueFilterOption {
  return {
    id: document.id,
    label: document.name,
    slug: document.slug,
  }
}

async function queryCatalogueFilterOptions(): Promise<CatalogueFilterOptions> {
  const payload = await getPayload({ config: configPromise })
  const activeWhere = { isActive: { not_equals: false } }
  const [categories, colors, designers, fabrics, silhouettes] = await Promise.all([
    payload.find({
      collection: 'categories',
      depth: 0,
      limit: LOOKUP_LIMIT,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, title: true },
      sort: ['sortOrder', 'title'],
      where: activeWhere,
    }),
    payload.find({
      collection: 'colors',
      depth: 0,
      limit: LOOKUP_LIMIT,
      overrideAccess: false,
      pagination: false,
      select: { name: true, slug: true },
      sort: ['sortOrder', 'name'],
      where: activeWhere,
    }),
    payload.find({
      collection: 'designers',
      depth: 0,
      limit: LOOKUP_LIMIT,
      overrideAccess: false,
      pagination: false,
      select: { name: true, slug: true },
      sort: ['sortOrder', 'name'],
      where: activeWhere,
    }),
    payload.find({
      collection: 'fabrics',
      depth: 0,
      limit: LOOKUP_LIMIT,
      overrideAccess: false,
      pagination: false,
      select: { name: true, slug: true },
      sort: ['sortOrder', 'name'],
      where: activeWhere,
    }),
    payload.find({
      collection: 'silhouettes',
      depth: 0,
      limit: LOOKUP_LIMIT,
      overrideAccess: false,
      pagination: false,
      select: { name: true, slug: true },
      sort: ['sortOrder', 'name'],
      where: activeWhere,
    }),
  ])

  return {
    categories: categories.docs.map((category) => ({
      id: category.id,
      label: category.title,
      slug: category.slug,
    })),
    colours: colors.docs.map(toOption),
    designers: designers.docs.map(toOption),
    fabrics: fabrics.docs.map(toOption),
    silhouettes: silhouettes.docs.map(toOption),
  }
}

const getCachedCatalogueFilterOptions = unstable_cache(
  queryCatalogueFilterOptions,
  ['catalogue-filter-options'],
  {
    revalidate: 300,
    tags: [CATALOGUE_FILTER_OPTIONS_CACHE_TAG],
  },
)

export async function getCatalogueFilterOptions({
  draft = false,
}: {
  draft?: boolean
} = {}): Promise<CatalogueFilterOptions> {
  return draft ? queryCatalogueFilterOptions() : getCachedCatalogueFilterOptions()
}
