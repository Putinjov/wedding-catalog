import configPromise from '@payload-config'
import { getPayload } from 'payload'

export async function getDresses() {
  const payload = await getPayload({
    config: configPromise,
  })

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
      ],
    },
  })

  return result.docs
}