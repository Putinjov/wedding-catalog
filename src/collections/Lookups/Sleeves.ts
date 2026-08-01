import { createLookupCollection } from './createLookupCollection'

export const Sleeves = createLookupCollection({
  slug: 'sleeves',
  singularLabel: 'Sleeve style',
  pluralLabel: 'Sleeve styles',
  description: 'Dress sleeve attributes',
})
