import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { DRESSES_CACHE_TAG } from '@/lib/dress-cache'
import type { Dress } from '@/payload-types'
import { attachDressMedia, type DressWithMedia } from '@/lib/dress-media'
import { buildPublicDressWhere } from '@/lib/public-dress-filters'

async function queryFeaturedDresses(): Promise<DressWithMedia[]> {
  const payload = await getPayload({
    config: configPromise,
  })

  const result = await payload.find({
    collection: 'dresses',
    depth: 2,
    draft: false,
    limit: 4,
    overrideAccess: false,
    sort: '-createdAt',
    where: buildPublicDressWhere({}, [{ featured: { equals: true } }]),
  })

  return attachDressMedia(result.docs as Dress[], payload)
}

const getCachedFeaturedDresses = unstable_cache(queryFeaturedDresses, ['featured-dresses-v1'], {
  revalidate: 300,
  tags: [DRESSES_CACHE_TAG],
})

export function getFeaturedDresses(): Promise<DressWithMedia[]> {
  return getCachedFeaturedDresses()
}
