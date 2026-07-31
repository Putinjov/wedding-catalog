import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { attachDressMedia, type DressWithMedia } from '@/lib/dress-media'
import { buildPublicDressWhere } from '@/lib/public-dress-filters'

export async function searchPublicDresses(query: string): Promise<DressWithMedia[]> {
  const normalizedQuery = query.trim().slice(0, 120)
  if (!normalizedQuery) return []

  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 12,
    overrideAccess: false,
    pagination: false,
    sort: 'name',
    where: buildPublicDressWhere({}, [
      {
        or: [
          { name: { like: normalizedQuery } },
          { shortDescription: { like: normalizedQuery } },
          { collectionName: { like: normalizedQuery } },
        ],
      },
    ]),
  })

  return attachDressMedia(result.docs, payload)
}
