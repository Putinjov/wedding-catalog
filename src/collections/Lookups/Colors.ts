import {createLookupCollection} from './createLookupCollection'

export const Colors = createLookupCollection({
  slug: 'colors',
  singularLabel: 'Color',
  pluralLabel: 'Colors',
  description: 'Available colors',
})