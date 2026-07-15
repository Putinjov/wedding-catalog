import type { Access } from 'payload'

import { hasRole } from './roles'

export const ownerOrPublished: Access = ({ req: { user } }) => {
  if (hasRole(user, ['owner'])) return true

  return {
    _status: {
      equals: 'published',
    },
  }
}

export const ownerOrManagerOrPublished: Access = ({ req: { user } }) => {
  if (hasRole(user, ['owner', 'manager'])) return true

  return {
    _status: {
      equals: 'published',
    },
  }
}
