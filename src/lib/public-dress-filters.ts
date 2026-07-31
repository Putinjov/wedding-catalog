import type { Where } from 'payload'

import type { DressMode } from '@/lib/catalogue'

export type PublicDressFilterOptions =
  | {
      availability: 'available'
      mode: DressMode
    }
  | {
      availability?: 'supported'
      mode?: DressMode
    }

function getPublicDressConditions(): Where[] {
  return [
    {
      _status: {
        equals: 'published',
      },
    },
    {
      publicVisibility: {
        equals: 'public',
      },
    },
  ]
}

function getModeCondition(mode: DressMode, availability: 'available' | 'supported'): Where {
  if (mode === 'buy') {
    return {
      saleStatus: {
        [availability === 'available' ? 'equals' : 'not_equals']:
          availability === 'available' ? 'available' : 'not-for-sale',
      },
    }
  }

  return {
    rentalStatus: {
      [availability === 'available' ? 'equals' : 'not_equals']:
        availability === 'available' ? 'available' : 'not-for-rent',
    },
  }
}

export function buildPublicDressWhere(
  options: PublicDressFilterOptions = {},
  additionalConditions: Where[] = [],
): Where {
  const availability = options.availability ?? 'supported'
  const availabilityCondition = options.mode
    ? getModeCondition(options.mode, availability)
    : {
        or: [
          getModeCondition('buy', 'supported'),
          getModeCondition('rent', 'supported'),
        ],
      }

  return {
    and: [...getPublicDressConditions(), availabilityCondition, ...additionalConditions],
  }
}
