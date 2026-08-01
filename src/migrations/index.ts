import * as migration_20260731_221500_split_dress_availability from './20260731_221500_split_dress_availability'
import * as migration_20260731_224500_add_dress_business_validation from './20260731_224500_add_dress_business_validation'
import * as migration_20260801_154500_add_catalogue_display_order from './20260801_154500_add_catalogue_display_order'

export const migrations = [
  {
    up: migration_20260731_221500_split_dress_availability.up,
    down: migration_20260731_221500_split_dress_availability.down,
    name: '20260731_221500_split_dress_availability',
  },
  {
    up: migration_20260731_224500_add_dress_business_validation.up,
    down: migration_20260731_224500_add_dress_business_validation.down,
    name: '20260731_224500_add_dress_business_validation',
  },
  {
    up: migration_20260801_154500_add_catalogue_display_order.up,
    down: migration_20260801_154500_add_catalogue_display_order.down,
    name: '20260801_154500_add_catalogue_display_order',
  },
]
