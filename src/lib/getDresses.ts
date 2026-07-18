import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Dress } from '@/payload-types'
import type { CatalogueMode } from '@/lib/catalogue'
import { attachDressMedia, type DressWithMedia } from '@/lib/dress-media'

export async function getDresses(mode: CatalogueMode): Promise<DressWithMedia[]> {
  const payload = await getPayload({
    config: configPromise,
  })

  const modeFilters =
    mode === 'buy'
      ? [
          {
          forSale: {
            equals: true,
          },
          },
        ]
      : [
          {
          availableForRent: {
            equals: true,
          },
          },
        ]

  const result = await payload.find({
    collection: 'dresses',
    depth: 2,
    limit: 24,
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
          availabilityStatus: {
            not_equals: 'hidden',
          },
        },
        ...modeFilters,
      ],
    },
  })

  return attachDressMedia(result.docs as Dress[], payload)
}
