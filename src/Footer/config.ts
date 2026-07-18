import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'
import { ownerOrManager } from '@/access/roles'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
    update: ownerOrManager,
  },
  admin: {
    description: 'Storefront footer navigation links.',
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
          RowLabel: '@/Footer/RowLabel#RowLabel',
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateFooter],
  },
}
