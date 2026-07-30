import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { getCanonicalOrigin } from '@/config/site-url'
import {
  createSitemapResponse,
  DRESSES_SITEMAP_CACHE_TAG,
  isValidSitemapSlug,
  type SitemapEntry,
} from '@/utilities/sitemap'

export async function queryDressesSitemap(): Promise<SitemapEntry[]> {
  const payload = await getPayload({ config })
  const origin = getCanonicalOrigin()
  const result = await payload.find({
    collection: 'dresses',
    depth: 0,
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
      updatedAt: true,
    },
    sort: 'slug',
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
        {
          or: [
            {
              forSale: {
                equals: true,
              },
            },
            {
              availableForRent: {
                equals: true,
              },
            },
          ],
        },
      ],
    },
  })

  return result.docs
    .filter((dress) => isValidSitemapSlug(dress.slug))
    .map((dress) => ({
      lastmod: dress.updatedAt,
      loc: `${origin}/dresses/${dress.slug}`,
    }))
}

const getDressesSitemap = unstable_cache(
  queryDressesSitemap,
  [DRESSES_SITEMAP_CACHE_TAG],
  {
    tags: [DRESSES_SITEMAP_CACHE_TAG],
  },
)

export async function GET(): Promise<Response> {
  return createSitemapResponse(await getDressesSitemap())
}
