import configPromise from '@payload-config'
import { getPayload, type PaginatedDocs } from 'payload'

import type { Dress } from '@/payload-types'
import {
  CATALOGUE_PAGE_SIZE,
  DEFAULT_CATALOGUE_SORT,
  getCatalogueDressSort,
  type CatalogueMode,
  type CatalogueSort,
} from '@/lib/catalogue'
import { attachDressMedia, type DressWithMedia } from '@/lib/dress-media'
import { buildPublicDressWhere } from '@/lib/public-dress-filters'

export async function getDresses(
  mode: CatalogueMode,
  {
    page = 1,
    sort = DEFAULT_CATALOGUE_SORT,
  }: { page?: number; sort?: CatalogueSort } = {},
): Promise<PaginatedDocs<DressWithMedia>> {
  const payload = await getPayload({
    config: configPromise,
  })

  const result = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: CATALOGUE_PAGE_SIZE,
    overrideAccess: false,
    page,
    sort: getCatalogueDressSort(mode, sort),
    where: buildPublicDressWhere({ availability: 'available', mode }),
  })

  const docs = await attachDressMedia(result.docs as Dress[], payload)

  return { ...result, docs }
}
