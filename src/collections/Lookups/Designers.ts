import {createLookupCollection} from './createLookupCollection'

export const Designers = createLookupCollection({
  slug: 'designers',
  singularLabel: 'Designer',
  pluralLabel: 'Designers',
  description: 'Available designers',
})