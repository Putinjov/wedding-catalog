import * as migration_20260731_221500_split_dress_availability from './20260731_221500_split_dress_availability'

export const migrations = [
  {
    up: migration_20260731_221500_split_dress_availability.up,
    down: migration_20260731_221500_split_dress_availability.down,
    name: '20260731_221500_split_dress_availability',
  },
]
