import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateCatalogueCaches, revalidateCatalogueLookupCaches } from '@/lib/dress-cache'

export const revalidateCatalogueLookup: CollectionAfterChangeHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateCatalogueLookupCaches()
  }

  return doc
}

export const revalidateCatalogueLookupDelete: CollectionAfterDeleteHook = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate) {
    revalidateCatalogueLookupCaches()
  }

  return doc
}

export const revalidateCatalogueMedia: CollectionAfterChangeHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) revalidateCatalogueCaches()
  return doc
}

export const revalidateCatalogueMediaDelete: CollectionAfterDeleteHook = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate) revalidateCatalogueCaches()
  return doc
}
