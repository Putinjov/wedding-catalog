import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Dress } from '@/payload-types'
import { attachDressMedia, type DressWithMedia } from '@/lib/dress-media'

export async function getFeaturedDresses(): Promise<DressWithMedia[]> {
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
          featured: {
            equals: true,
          },
        },
        {
          publicVisibility: {
            equals: 'public',
          },
        },
        {
          or: [
            {
              saleStatus: {
                not_equals: 'not-for-sale',
              },
            },
            {
              rentalStatus: {
                not_equals: 'not-for-rent',
              },
            },
          ],
        },
      ],
    },
  })

  return attachDressMedia(result.docs as Dress[], payload)
}
