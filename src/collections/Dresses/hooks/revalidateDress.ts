import { revalidatePath, revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Dress } from '@/payload-types'
import { revalidateCatalogueCaches, revalidateDressSlugCaches } from '@/lib/dress-cache'
import { DRESSES_SITEMAP_CACHE_TAG } from '@/utilities/sitemap'
import { getDressPath } from '@/utilities/dress-routing'

export const revalidateDress: CollectionAfterChangeHook<Dress> = ({
  doc,
  previousDoc,
  req: { context },
}) => {
  if (context.disableRevalidate) {
    return doc
  }

  if (doc._status === 'published') {
    revalidatePath(getDressPath(doc.slug))
  }

  if (
    previousDoc?._status === 'published' &&
    (previousDoc.slug !== doc.slug || doc._status !== 'published')
  ) {
    revalidatePath(getDressPath(previousDoc.slug))
  }

  if (doc._status === 'published' || previousDoc?._status === 'published') {
    revalidateCatalogueCaches()
    revalidateDressSlugCaches(doc.slug, ...(previousDoc ? [previousDoc.slug] : []))
    // Redirect records contain populated target slugs; rename must expire that snapshot too.
    if (previousDoc && previousDoc.slug !== doc.slug) {
      revalidateTag('redirects', { expire: 0 })
    }
    revalidateTag(DRESSES_SITEMAP_CACHE_TAG, 'max')
  }

  return doc
}

export const revalidateDressDelete: CollectionAfterDeleteHook<Dress> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate && doc._status === 'published') {
    revalidateCatalogueCaches()
    revalidateDressSlugCaches(doc.slug)
    revalidatePath(getDressPath(doc.slug))
    revalidateTag(DRESSES_SITEMAP_CACHE_TAG, 'max')
  }

  return doc
}
