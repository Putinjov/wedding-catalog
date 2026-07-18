import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'
import { ownerOrManager } from '@/access/roles'

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
    update: ownerOrManager,
  },
  admin: {
    description: 'Primary storefront navigation links.',
    group: 'Content',
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 6,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/Header/RowLabel#RowLabel',
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
