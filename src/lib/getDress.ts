import configPromise from '@payload-config'
import { getPayload, type Where } from 'payload'
import { cache } from 'react'

import type { DressMode } from '@/lib/catalogue'
import type { Dress } from '@/payload-types'
import { attachDressMedia, type DressWithMedia } from '@/lib/dress-media'
import { buildPublicDressWhere } from '@/lib/public-dress-filters'

function getRelationshipId(value: unknown): string | null {
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

export async function getRelatedDresses({
  dress,
  mode,
}: {
  dress: Dress
  mode: DressMode
}): Promise<DressWithMedia[]> {
  const payload = await getPayload({
    config: configPromise,
  })
  const sharedConditions: Where[] = [
    {
      id: {
        not_equals: dress.id,
      },
    },
  ]
  const categoryId = getRelationshipId(dress.category)
  const silhouetteId = getRelationshipId(dress.silhouette)
  const preferredFilters: Where[] = [
    ...(categoryId ? [{ category: { equals: categoryId } }] : []),
    ...(silhouetteId ? [{ silhouette: { equals: silhouetteId } }] : []),
  ]

  if (preferredFilters.length === 0) {
    const result = await payload.find({
      collection: 'dresses',
      depth: 2,
      limit: 4,
      overrideAccess: false,
      sort: '-createdAt',
      where: buildPublicDressWhere(
        { availability: 'available', mode },
        sharedConditions,
      ),
    })

    return attachDressMedia(result.docs, payload)
  }

  const preferredResult = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 4,
    overrideAccess: false,
    sort: '-createdAt',
    where: buildPublicDressWhere(
      { availability: 'available', mode },
      [...sharedConditions, { or: preferredFilters }],
    ),
  })

  if (preferredResult.docs.length >= 4) {
    return attachDressMedia(preferredResult.docs, payload)
  }

  const preferredIds = preferredResult.docs.map((relatedDress) => relatedDress.id)
  const fallbackResult = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 4 - preferredResult.docs.length,
    overrideAccess: false,
    sort: '-createdAt',
    where: buildPublicDressWhere(
      { availability: 'available', mode },
      [
        ...sharedConditions,
        ...(preferredIds.length > 0 ? [{ id: { not_in: preferredIds } }] : []),
      ],
    ),
  })

  return attachDressMedia([...preferredResult.docs, ...fallbackResult.docs], payload)
}
