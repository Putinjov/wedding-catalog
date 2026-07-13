import {createLookupCollection} from './createLookupCollection'

export const Fabrics = createLookupCollection({
  slug: 'fabrics',
  singularLabel: 'Fabric',
  pluralLabel: 'Fabrics',
  description: 'Available fabrics',
})