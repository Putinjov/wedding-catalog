import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { ownerOrManager } from '../access/roles'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    admin: ownerOrManager,
    create: ownerOrManager,
    delete: ownerOrManager,
    read: anyone,
    update: ownerOrManager,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
     },
     {
      name:'parent',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        position: 'sidebar',
        description: 'Optional parent category',
      },
     },
     {
      name:'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
     },
     {
      name:'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
     },
    slugField({
      position: undefined,
    }),
  ],
}
