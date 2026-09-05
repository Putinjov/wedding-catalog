import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { ownerOrManager } from '@/access/roles'
import {
  revalidateCatalogueLookup,
  revalidateCatalogueLookupDelete,
} from '@/collections/hooks/revalidateCatalogue'

type LookupCollectionOptions = {
  slug: string
  singularLabel: string
  pluralLabel: string
  description?: string
  invalidatesCatalogue?: boolean
}

export const createLookupCollection = ({
  slug,
  singularLabel,
  pluralLabel,
  description,
  invalidatesCatalogue = false,
}: LookupCollectionOptions): CollectionConfig => ({
  slug,

  labels: {
    singular: singularLabel,
    plural: pluralLabel,
  },

  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'isActive', 'sortOrder', 'updatedAt'],
    group: 'Settings',
    description,
  },

  access: {
    admin: ownerOrManager,
    create: ownerOrManager,
    delete: ownerOrManager,
    read: () => true,
    update: ownerOrManager,
  },

  hooks: invalidatesCatalogue
    ? {
        afterChange: [revalidateCatalogueLookup],
        afterDelete: [revalidateCatalogueLookupDelete],
      }
    : undefined,

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
