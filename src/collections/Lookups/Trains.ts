import { createLookupCollection } from './createLookupCollection'

export const Trains = createLookupCollection({
  slug: 'trains',
  singularLabel: 'Train style',
  pluralLabel: 'Train styles',
  description: 'Dress train attributes',
})
