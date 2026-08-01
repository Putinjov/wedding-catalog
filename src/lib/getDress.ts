import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { DressMode } from '@/lib/catalogue'
import type { Dress } from '@/payload-types'
import { attachDressMedia, type DressWithMedia } from '@/lib/dress-media'
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

const queryPublicDressBySlug = cache(async (
  slug: string,
  mode: DressMode | null,
): Promise<DressWithMedia | null> => {
  const payload = await getPayload({
    config: configPromise,
  })

  const filterOptions = mode
    ? ({ availability: 'available', mode } as const)
    : ({} as const)

  const result = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 1,
    overrideAccess: false,
    where: buildPublicDressWhere(filterOptions, [{ slug: { equals: slug } }]),
  })

  const dress = result.docs[0]
  if (!dress) return null
  return (await attachDressMedia([dress], payload))[0] ?? null
})

export function getDressBySlug(slug: string): Promise<DressWithMedia | null> {
  return queryPublicDressBySlug(slug, null)
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

function getModePrice(dress: Dress, mode: DressMode): number | null {
  const price = mode === 'buy' ? dress.salePrice : dress.rentalPrice
  return typeof price === 'number' ? price : null
}

export function rankRelatedDresses(
  candidates: readonly Dress[],
  reference: RelatedDressReference,
  limit = 4,
): Dress[] {
  function tier(candidate: Dress): number {
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

  function priceDifference(candidate: Dress): number {
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

const queryRelatedDresses = cache(async (
  dressId: string,
  mode: DressMode,
  categoryId: string | null,
  silhouetteId: string | null,
  designerId: string | null,
  price: number | null,
): Promise<DressWithMedia[]> => {
  const payload = await getPayload({
    config: configPromise,
  })
  const result = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 100,
    overrideAccess: false,
    sort: ['-featured', 'displayOrder', '-createdAt', 'id'],
    where: buildPublicDressWhere(
      { availability: 'available', mode },
      [{ id: { not_equals: dressId } }],
    ),
  })
  const ranked = rankRelatedDresses(result.docs, {
    categoryId,
    designerId,
    id: dressId,
    mode,
    price,
    silhouetteId,
  })

  return attachDressMedia(ranked, payload)
})

export function getRelatedDresses({
  dress,
  mode,
}: {
  dress: Dress
  mode: DressMode
}): Promise<DressWithMedia[]> {
  return queryRelatedDresses(
    dress.id,
    mode,
    getRelationshipId(dress.category),
    getRelationshipId(dress.silhouette),
    getRelationshipId(dress.designer),
    getModePrice(dress, mode),
  )
}
