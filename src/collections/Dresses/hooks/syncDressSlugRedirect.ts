import { APIError, type CollectionAfterChangeHook } from 'payload'

import type { Dress } from '@/payload-types'
import { getDressPath } from '@/utilities/dress-routing'

export const syncDressSlugRedirect: CollectionAfterChangeHook<Dress> = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (operation === 'create') {
    const reservedPath = await req.payload.find({
      collection: 'redirects',
      depth: 0,
      limit: 1,
      pagination: false,
      req,
      where: {
        from: {
          equals: getDressPath(doc.slug),
        },
      },
    })

    if (reservedPath.docs[0]) {
      throw new APIError(
        'This dress slug is reserved by an existing redirect. Choose another slug.',
        409,
      )
    }

    return doc
  }

  if (
    previousDoc._status !== 'published' ||
    doc._status !== 'published' ||
    previousDoc.slug === doc.slug
  ) {
    return doc
  }

  const from = getDressPath(previousDoc.slug)
  const existingRedirect = await req.payload.find({
    collection: 'redirects',
    depth: 0,
    limit: 1,
    pagination: false,
    req,
    where: {
      from: {
        equals: from,
      },
    },
  })

  const data = {
    from,
    to: {
      type: 'reference' as const,
      reference: {
        relationTo: 'dresses' as const,
        value: doc.id,
      },
    },
    type: '308' as const,
  }

  if (existingRedirect.docs[0]) {
    await req.payload.update({
      collection: 'redirects',
      id: existingRedirect.docs[0].id,
      data,
      req,
    })
  } else {
    await req.payload.create({
      collection: 'redirects',
      data,
      req,
    })
  }

  return doc
}
