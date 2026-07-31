import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Dress } from '@/payload-types'
import { attachDressMedia, type DressWithMedia } from '@/lib/dress-media'
import { buildPublicDressWhere } from '@/lib/public-dress-filters'

export async function getFeaturedDresses(): Promise<DressWithMedia[]> {
  const payload = await getPayload({
    config: configPromise,
  })

  const result = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 4,
    overrideAccess: false,
    sort: '-createdAt',
    where: buildPublicDressWhere({}, [{ featured: { equals: true } }]),
  })

  return attachDressMedia(result.docs as Dress[], payload)
}
