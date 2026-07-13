import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Dress } from '@/payload-types'

export async function getFeaturedDresses(): Promise<Dress[]> {
  const payload = await getPayload({
    config: configPromise,
  })

  const result = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 4,
    sort: '-createdAt',
    where: {
      and: [
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
          featured: {
            equals: true,
          },
        },
        {
          availabilityStatus: {
            not_equals: 'hidden',
          },
        },
      ],
    },
  })

  return result.docs
}
