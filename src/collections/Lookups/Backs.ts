import { createLookupCollection } from './createLookupCollection'

export const Backs = createLookupCollection({
  slug: 'backs',
  singularLabel: 'Back style',
  pluralLabel: 'Back styles',
  description: 'Dress back attributes',
})
