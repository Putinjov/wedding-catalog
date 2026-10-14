import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { DressMode } from '@/lib/catalogue'
import type { Dress } from '@/payload-types'
import {
  dressCardMediaSelect,
  dressCardPopulate,
  dressCardSelect,
  relatedRankSelect,
  type DressCardRecord,
  type RelatedRankRecord,
} from '@/lib/dress-card-query'
import { attachDressMedia, type DressCardWithMedia, type DressWithMedia } from '@/lib/dress-media'
import { DRESSES_CACHE_TAG, getDressSlugCacheTag, getRelatedDressCacheTag } from '@/lib/dress-cache'
import { buildPublicDressWhere } from '@/lib/public-dress-filters'

export function getRelationshipId(value: unknown): string | null {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = value.id
    return typeof id === 'string' ? id : null
  }

  return null
}

async function queryPublicDressBySlug(
  slug: string,
  mode: DressMode | null,
): Promise<DressWithMedia | null> {
  const payload = await getPayload({
    config: configPromise,
  })

  const filterOptions = mode
    ? ({ availability: 'available', mode } as const)
    : ({} as const)

  const result = await payload.find({
    collection: 'dresses',
    depth: 2,
    draft: false,
    limit: 1,
    overrideAccess: false,
    where: buildPublicDressWhere(filterOptions, [{ slug: { equals: slug } }]),
  })

  const dress = result.docs[0]
  if (!dress) return null
  return (await attachDressMedia([dress], payload))[0] ?? null
}

class UncacheableDressResult extends Error {}

const queryDressDetail = cache(async (slug: string): Promise<DressWithMedia | null> => {
  const { isEnabled: draft } = await draftMode()
  if (draft) return queryPublicDressBySlug(slug, null)

  const getCachedDress = unstable_cache(
    async () => {
      const dress = await queryPublicDressBySlug(slug, null)
      // Rejected callbacks are not persisted. Unknown/hidden URLs must not fill the cache,
      // and a newly published dress must not inherit a cached null result.
      if (!dress) throw new UncacheableDressResult('Public dress unavailable.')
      return dress
    },
    ['dress-detail-v1', slug],
    { revalidate: 300, tags: [DRESSES_CACHE_TAG, getDressSlugCacheTag(slug)] },
  )

  try {
    return await getCachedDress()
  } catch (error) {
    if (error instanceof UncacheableDressResult) return null
    throw error
  }
})

export function getDressBySlug(
  slug: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<DressWithMedia | null> {
  return fresh ? queryPublicDressBySlug(slug, null) : queryDressDetail(slug)
}

export function getAvailableDressBySlug(
  slug: string,
  mode: DressMode,
): Promise<DressWithMedia | null> {
  return queryPublicDressBySlug(slug, mode)
}

type RelatedDressReference = {
  categoryId: string | null
  designerId: string | null
  id: string
  mode: DressMode
  price: number | null
  silhouetteId: string | null
}

function getModePrice(dress: Pick<Dress, 'salePrice' | 'rentalPrice'>, mode: DressMode): number | null {
  const price = mode === 'buy' ? dress.salePrice : dress.rentalPrice
  return typeof price === 'number' ? price : null
}

export function rankRelatedDresses<T extends RelatedRankRecord>(
  candidates: readonly T[],
  reference: RelatedDressReference,
  limit = 4,
): T[] {
  function tier(candidate: T): number {
    const sameCategory =
      reference.categoryId !== null && getRelationshipId(candidate.category) === reference.categoryId
    const sameSilhouette =
      reference.silhouetteId !== null &&
      getRelationshipId(candidate.silhouette) === reference.silhouetteId
    const sameDesigner =
      reference.designerId !== null && getRelationshipId(candidate.designer) === reference.designerId

    if (sameCategory && sameSilhouette) return 0
    if (sameSilhouette) return 1
    if (sameDesigner) return 2
    if (reference.price !== null && getModePrice(candidate, reference.mode) !== null) return 3
    if (candidate.featured) return 4
    return 5
  }

  function priceDifference(candidate: T): number {
    const candidatePrice = getModePrice(candidate, reference.mode)
    return reference.price === null || candidatePrice === null
      ? Number.POSITIVE_INFINITY
      : Math.abs(candidatePrice - reference.price)
  }

  return [...candidates]
    .filter((candidate) => candidate.id !== reference.id)
    .sort((first, second) => {
      const tierDifference = tier(first) - tier(second)
      if (tierDifference !== 0) return tierDifference

      const firstPriceDifference = priceDifference(first)
      const secondPriceDifference = priceDifference(second)
      if (firstPriceDifference !== secondPriceDifference) {
        return firstPriceDifference - secondPriceDifference
      }

      const featuredDifference = Number(Boolean(second.featured)) - Number(Boolean(first.featured))
      if (featuredDifference !== 0) return featuredDifference

      const orderDifference = (first.displayOrder ?? 0) - (second.displayOrder ?? 0)
      if (orderDifference !== 0) return orderDifference

      const createdDifference = second.createdAt.localeCompare(first.createdAt)
      return createdDifference !== 0 ? createdDifference : first.id.localeCompare(second.id)
    })
    .slice(0, limit)
}

async function loadRelatedDresses(
  dressId: string,
  mode: DressMode,
  categoryId: string | null,
  silhouetteId: string | null,
  designerId: string | null,
  price: number | null,
): Promise<DressCardWithMedia[]> {
  const payload = await getPayload({
    config: configPromise,
  })
  const result = await payload.find({
    collection: 'dresses',
    depth: 0,
    draft: false,
    limit: 100,
    overrideAccess: false,
    page: 1,
    select: relatedRankSelect,
    sort: ['-featured', 'displayOrder', '-createdAt', 'id'],
    where: buildPublicDressWhere(
      { availability: 'available', mode },
      [{ id: { not_equals: dressId } }],
    ),
  })
  const ranked = rankRelatedDresses(result.docs as RelatedRankRecord[], {
    categoryId,
    designerId,
    id: dressId,
    mode,
    price,
    silhouetteId,
  })

  if (ranked.length === 0) return []

  // Recheck availability when hydrating the four visible cards; it may have changed
  // between the candidate and card queries.
  const cards = await payload.find({
    collection: 'dresses',
    depth: 1,
    draft: false,
    limit: ranked.length,
    overrideAccess: false,
    pagination: false,
    populate: dressCardPopulate,
    select: dressCardSelect,
    where: buildPublicDressWhere(
      { availability: 'available', mode },
      [{ id: { in: ranked.map(({ id }) => id) } }],
    ),
  })
  const cardsByID = new Map((cards.docs as DressCardRecord[]).map((card) => [card.id, card]))
  const orderedCards = ranked.flatMap(({ id }) => {
    const card = cardsByID.get(id)
    return card ? [card] : []
  })

  return attachDressMedia(orderedCards, payload, { mediaSelect: dressCardMediaSelect })
}

const queryRelatedDresses = cache(
  async (
    dressId: string,
    mode: DressMode,
    categoryId: string | null,
    silhouetteId: string | null,
    designerId: string | null,
    price: number | null,
  ): Promise<DressCardWithMedia[]> => {
    const { isEnabled: draft } = await draftMode()
    const query = draft
      ? loadRelatedDresses
      : unstable_cache(loadRelatedDresses, ['related-dresses-v2'], {
          revalidate: 300,
          tags: [DRESSES_CACHE_TAG, getRelatedDressCacheTag(dressId, mode)],
        })

    return query(dressId, mode, categoryId, silhouetteId, designerId, price)
  },
)

export function getRelatedDresses({
  dress,
  mode,
}: {
  dress: Dress
  mode: DressMode
}): Promise<DressCardWithMedia[]> {
  return queryRelatedDresses(
    dress.id,
    mode,
    getRelationshipId(dress.category),
    getRelationshipId(dress.silhouette),
    getRelationshipId(dress.designer),
    getModePrice(dress, mode),
  )
}
