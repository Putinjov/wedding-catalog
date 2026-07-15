import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { ownerOrManager } from '@/access/roles'

type LookupCollectionOptions = {
  slug: string
  singularLabel: string
  pluralLabel: string
  description?: string
}

export const createLookupCollection = ({
  slug,
  singularLabel,
  pluralLabel,
  description,
}: LookupCollectionOptions): CollectionConfig => ({
  slug,

  labels: {
    singular: singularLabel,
    plural: pluralLabel,
  },

  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'isActive', 'sortOrder', 'updatedAt'],
    group: 'Catalog',
    description,
  },

  access: {
    admin: ownerOrManager,
    create: ownerOrManager,
    delete: ownerOrManager,
    read: () => true,
    update: ownerOrManager,
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },

    slugField({
      fieldToUse: 'name',
    }),

    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        position: 'sidebar',
      },
    },
  ],
})
