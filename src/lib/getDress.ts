import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { DressMode } from '@/lib/catalogue'
import type { Dress } from '@/payload-types'
import { attachDressMedia, type DressWithMedia } from '@/lib/dress-media'

type QueryWhereField = Record<string, string | number | boolean | string[] | null>
type QueryWhere = Record<string, QueryWhere[] | QueryWhereField>

const publishedDressFilters: QueryWhere[] = [
  {
    _status: {
      equals: 'published',
    },
  },
  {
    isActive: {
      equals: true,
    },
  },
  {
    availabilityStatus: {
      not_equals: 'hidden',
    },
  },
]

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

export const getDressBySlug = cache(async (slug: string): Promise<DressWithMedia | null> => {
  const payload = await getPayload({
    config: configPromise,
  })

  const result = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 1,
    where: {
      and: [
        ...publishedDressFilters,
        {
          slug: {
            equals: slug,
          },
        },
      ],
    },
  })

  const dress = result.docs[0]
  if (!dress) return null
  return (await attachDressMedia([dress], payload))[0] ?? null
})

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
  const modeFilters: QueryWhere[] =
    mode === 'buy'
      ? [{ forSale: { equals: true } }]
      : [{ availableForRent: { equals: true } }]
  const sharedFilters = [
    ...publishedDressFilters,
    {
      id: {
        not_equals: dress.id,
      },
    },
    ...modeFilters,
  ]
  const categoryId = getRelationshipId(dress.category)
  const silhouetteId = getRelationshipId(dress.silhouette)
  const preferredFilters: QueryWhere[] = [
    ...(categoryId ? [{ category: { equals: categoryId } }] : []),
    ...(silhouetteId ? [{ silhouette: { equals: silhouetteId } }] : []),
  ]

  if (preferredFilters.length === 0) {
    const result = await payload.find({
      collection: 'dresses',
      depth: 2,
      limit: 4,
      sort: '-createdAt',
      where: {
        and: sharedFilters,
      },
    })

    return attachDressMedia(result.docs, payload)
  }

  const preferredResult = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 4,
    sort: '-createdAt',
    where: {
      and: [
        ...sharedFilters,
        {
          or: preferredFilters,
        },
      ],
    },
  })

  if (preferredResult.docs.length >= 4) {
    return attachDressMedia(preferredResult.docs, payload)
  }

  const preferredIds = preferredResult.docs.map((relatedDress) => relatedDress.id)
  const fallbackResult = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 4 - preferredResult.docs.length,
    sort: '-createdAt',
    where: {
      and: [
        ...sharedFilters,
        ...(preferredIds.length > 0 ? [{ id: { not_in: preferredIds } }] : []),
      ],
    },
  })

  return attachDressMedia([...preferredResult.docs, ...fallbackResult.docs], payload)
}
