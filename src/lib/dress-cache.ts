import { revalidateTag } from 'next/cache'

import type { CatalogueMode } from '@/lib/catalogue'

export const DRESSES_CACHE_TAG = 'dresses'
export const CATALOGUE_FILTER_OPTIONS_CACHE_TAG = 'catalogue-filter-options'

export function getCatalogueModeCacheTag(mode: CatalogueMode): string {
  return `dresses:catalogue:${mode}`
}

export function getCatalogueCacheTags(mode: CatalogueMode): string[] {
  return [DRESSES_CACHE_TAG, getCatalogueModeCacheTag(mode)]
}

export function revalidateCatalogueCaches(): void {
  // A hidden or unavailable dress must not be served once more via stale-while-revalidate.
  revalidateTag(DRESSES_CACHE_TAG, { expire: 0 })
  revalidateTag(getCatalogueModeCacheTag('buy'), { expire: 0 })
  revalidateTag(getCatalogueModeCacheTag('rent'), { expire: 0 })
}

export function revalidateCatalogueLookupCaches(): void {
  revalidateTag(CATALOGUE_FILTER_OPTIONS_CACHE_TAG, { expire: 0 })
  revalidateCatalogueCaches()
}
