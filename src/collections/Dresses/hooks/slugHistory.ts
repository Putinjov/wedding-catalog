import { APIError, type CollectionBeforeChangeHook } from 'payload'

import type { Dress } from '@/payload-types'
import { getDressPath } from '@/utilities/dress-routing'

function getHistoricalSlugs(dress: Dress): string[] {
  return (dress.slugHistory ?? []).flatMap((entry) =>
    typeof entry.slug === 'string' && entry.slug.length > 0 ? [entry.slug] : [],
  )
}

export const protectAndTrackDressSlug: CollectionBeforeChangeHook<Dress> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === 'create') {
    data.slugHistory = []
    return data
  }

  if (!originalDoc) return data

  const nextSlug = data.slug ?? originalDoc.slug
  const slugChanged = nextSlug !== originalDoc.slug

  data.slugHistory = originalDoc.slugHistory ?? []

  if (!slugChanged) {
    return data
  }

  const nextStatus = data._status ?? originalDoc._status

  if (originalDoc._status === 'published') {
    if (nextStatus !== 'published') {
      throw new APIError(
        'A live dress slug can only be changed while publishing the dress.',
        400,
      )
    }

    if (data.confirmSlugChange !== true) {
      throw new APIError(
        'Confirm the published URL change before changing this dress slug.',
        400,
      )
    }
  }

  const reservedPath = await req.payload.find({
    collection: 'redirects',
    depth: 0,
    limit: 1,
    pagination: false,
    req,
    where: {
      from: {
        equals: getDressPath(nextSlug),
      },
    },
  })
  const existingReference = reservedPath.docs[0]?.to?.reference
  const existingDressID =
    existingReference?.relationTo === 'dresses'
      ? typeof existingReference.value === 'string'
        ? existingReference.value
        : (existingReference.value as Dress | null)?.id
      : null

  if (reservedPath.docs[0] && existingDressID !== originalDoc.id) {
    throw new APIError(
      'This dress slug is reserved by an existing redirect. Choose another slug.',
      409,
    )
  }

  const previousSlugs = getHistoricalSlugs(originalDoc)

  if (!previousSlugs.includes(originalDoc.slug)) {
    data.slugHistory = [...(originalDoc.slugHistory ?? []), { slug: originalDoc.slug }]
  }

  return data
}
