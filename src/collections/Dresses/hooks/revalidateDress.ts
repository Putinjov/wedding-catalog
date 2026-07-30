import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Dress } from '@/payload-types'
import { DRESSES_SITEMAP_CACHE_TAG } from '@/utilities/sitemap'

export const revalidateDress: CollectionAfterChangeHook<Dress> = ({
  doc,
  previousDoc,
  req: { context },
}) => {
  if (
    !context.disableRevalidate &&
    (doc._status === 'published' || previousDoc?._status === 'published')
  ) {
    revalidateTag(DRESSES_SITEMAP_CACHE_TAG, 'max')
  }

  return doc
}

export const revalidateDressDelete: CollectionAfterDeleteHook<Dress> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate && doc._status === 'published') {
    revalidateTag(DRESSES_SITEMAP_CACHE_TAG, 'max')
  }

  return doc
}
