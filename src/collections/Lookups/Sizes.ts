import {createLookupCollection} from './createLookupCollection'

export const Sizes = createLookupCollection({
  slug: 'sizes',
  singularLabel: 'Size',
  pluralLabel: 'Sizes',
  description: 'Available dress sizes',
})