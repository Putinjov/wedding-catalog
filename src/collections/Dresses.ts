import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { ownerOrManager } from '@/access/roles'
import { ownerOrManagerOrPublished } from '@/access/ownerOrPublished'
import {
  revalidateDress,
  revalidateDressDelete,
} from '@/collections/Dresses/hooks/revalidateDress'
import { protectAndTrackDressSlug } from '@/collections/Dresses/hooks/slugHistory'
import { syncDressSlugRedirect } from '@/collections/Dresses/hooks/syncDressSlugRedirect'
import {
  rejectDuplicateDressSlug,
  validateDressBusinessRules,
} from '@/collections/Dresses/hooks/validateDressBusinessRules'

export const Dresses: CollectionConfig = {
  slug: 'dresses',

  labels: {
    singular: 'Dress',
    plural: 'Dresses',
  },

  admin: {
    useAsTitle: 'name',
    defaultColumns: [
      'name',
      'sku',
      'publicVisibility',
      'saleStatus',
      'rentalStatus',
      'salePrice',
      'rentalPrice',
      'updatedAt',
    ],
    group: 'Dresses',
    description: 'Wedding dresses available to buy or rent, including pricing, availability and imagery.',
  },

  access: {
    admin: ownerOrManager,
    create: ownerOrManager,
    delete: ownerOrManager,
    read: ownerOrManagerOrPublished,
    update: ownerOrManager,
  },

  versions: {
    drafts: true,
  },

  hooks: {
    beforeValidate: [validateDressBusinessRules],
    beforeChange: [protectAndTrackDressSlug],
    afterChange: [syncDressSlugRedirect, revalidateDress],
    afterDelete: [revalidateDressDelete],
  },

  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              localized: true,
            },

            slugField({
              fieldToUse: 'name',
              overrides: (field) => {
                const generateSlug = field.fields.find(
                  (nestedField) =>
                    'name' in nestedField && nestedField.name === 'generateSlug',
                )
                if (generateSlug?.type === 'checkbox') {
                  generateSlug.hooks = {
                    ...generateSlug.hooks,
                    beforeChange: [
                      ...(generateSlug.hooks?.beforeChange ?? []),
                      rejectDuplicateDressSlug,
                    ],
                  }
                }

                return field
              },
            }),

            {
              name: 'confirmSlugChange',
              type: 'checkbox',
              virtual: true,
              admin: {
                condition: (data) => data?._status === 'published',
                description:
                  'Required when changing the URL of a published dress. The previous URL will permanently redirect to the new one.',
              },
              label: 'Confirm published URL change',
            },

            {
              name: 'slugHistory',
              type: 'array',
              admin: {
                description: 'Previous dress URL slugs retained for permanent redirects.',
                readOnly: true,
              },
              fields: [
                {
                  name: 'slug',
                  type: 'text',
                  required: true,
                },
              ],
            },

            {
              name: 'sku',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              admin: {
                description: 'Internal product code, for example WD-0001',
              },
            },

            {
              name: 'shortDescription',
              type: 'textarea',
              localized: true,
              maxLength: 300,
            },

            {
              name: 'description',
              type: 'richText',
              localized: true,
            },

            {
              name: 'category',
              type: 'relationship',
              relationTo: 'categories',
              required: true,
            },

            {
              name: 'designer',
              type: 'relationship',
              relationTo: 'designers',
            },

            {
              name: 'collectionName',
              type: 'text',
              admin: {
                description: 'Designer collection name, for example Bridal 2027',
              },
            },
          ],
        },

        {
          label: 'Specifications',
          fields: [
            {
              name: 'sizes',
              type: 'relationship',
              relationTo: 'sizes',
              hasMany: true,
            },

            {
              name: 'colors',
              type: 'relationship',
              relationTo: 'colors',
              hasMany: true,
            },

            {
              name: 'fabrics',
              type: 'relationship',
              relationTo: 'fabrics',
              hasMany: true,
            },

            {
              name: 'silhouette',
              type: 'relationship',
              relationTo: 'silhouettes',
            },

            {
              name: 'neckline',
              type: 'relationship',
              relationTo: 'necklines',
            },

            {
              name: 'sleeves',
              type: 'relationship',
              relationTo: 'sleeves',
            },

            {
              name: 'train',
              type: 'relationship',
              relationTo: 'trains',
            },

            {
              name: 'back',
              type: 'relationship',
              relationTo: 'backs',
            },

            {
              name: 'waistline',
              type: 'relationship',
              relationTo: 'waistlines',
            },

            {
              name: 'embellishments',
              type: 'relationship',
              relationTo: 'embellishments',
              hasMany: true,
            },

            {
              name: 'condition',
              type: 'select',
              required: true,
              defaultValue: 'new',
              options: [
                {
                  label: 'New',
                  value: 'new',
                },
                {
                  label: 'Like New',
                  value: 'like-new',
                },
                {
                  label: 'Excellent',
                  value: 'excellent',
                },
                {
                  label: 'Good',
                  value: 'good',
                },
                {
                  label: 'Needs Cleaning',
                  value: 'needs-cleaning',
                },
                {
                  label: 'Needs Repair',
                  value: 'needs-repair',
                },
              ],
            },

            {
              name: 'featured',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },

        {
          label: 'Fit & Alterations',
          fields: [
            {
              name: 'fitNotes',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Optional fit guidance suitable for the public dress page.',
              },
            },

            {
              name: 'alterationPossibilities',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Alterations that may be discussed during an individual fitting.',
              },
            },

            {
              name: 'alterationLimitations',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Known alteration constraints to communicate before booking.',
              },
            },

            {
              name: 'includedAccessories',
              type: 'array',
              admin: {
                description: 'Accessories included with this individual dress.',
              },
              fields: [
                {
                  name: 'item',
                  type: 'text',
                  localized: true,
                  required: true,
                },
              ],
            },

            {
              name: 'optionalAccessories',
              type: 'array',
              admin: {
                description: 'Accessories available separately; do not imply they are included.',
              },
              fields: [
                {
                  name: 'item',
                  type: 'text',
                  localized: true,
                  required: true,
                },
              ],
            },
          ],
        },

        {
          label: 'Sale & Rental',
          fields: [
            {
              name: 'saleStatus',
              type: 'select',
              required: true,
              defaultValue: 'available',
              label: 'Sale status',
              admin: {
                description:
                  'Controls Buy catalogue visibility and purchase enquiries independently of rental status.',
              },
              options: [
                {
                  label: 'Not offered for sale',
                  value: 'not-for-sale',
                },
                {
                  label: 'Available for sale',
                  value: 'available',
                },
                {
                  label: 'Reserved for sale',
                  value: 'reserved',
                },
                {
                  label: 'Sold',
                  value: 'sold',
                },
              ],
            },

            {
              name: 'salePrice',
              type: 'number',
              min: 0,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.saleStatus !== 'not-for-sale',
                step: 0.01,
              },
            },

            {
              name: 'salePriceOnRequest',
              type: 'checkbox',
              defaultValue: false,
              label: 'Price on request',
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.saleStatus !== 'not-for-sale',
                description:
                  'Use only when the dress is offered for sale without a published price.',
              },
            },

            {
              name: 'previousSalePrice',
              type: 'number',
              min: 0,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.saleStatus !== 'not-for-sale',
                description: 'Optional original price shown before discount',
                step: 0.01,
              },
            },

            {
              name: 'rentalStatus',
              type: 'select',
              required: true,
              defaultValue: 'not-for-rent',
              label: 'Rental status',
              admin: {
                description:
                  'Controls Rent catalogue visibility and rental enquiries independently of sale status. Cleaning and repair block rental availability.',
              },
              options: [
                {
                  label: 'Not offered for rental',
                  value: 'not-for-rent',
                },
                {
                  label: 'Available for rental',
                  value: 'available',
                },
                {
                  label: 'Reserved for rental',
                  value: 'reserved',
                },
                {
                  label: 'Currently rented',
                  value: 'rented',
                },
                {
                  label: 'Cleaning',
                  value: 'cleaning',
                },
                {
                  label: 'Repair',
                  value: 'repair',
                },
              ],
            },

            {
              name: 'rentalPrice',
              type: 'number',
              min: 0,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.rentalStatus !== 'not-for-rent',
                step: 0.01,
              },
            },

            {
              name: 'securityDeposit',
              type: 'number',
              min: 0,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.rentalStatus !== 'not-for-rent',
                step: 0.01,
              },
            },

            {
              name: 'rentalPeriodDays',
              type: 'number',
              min: 1,
              defaultValue: 4,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.rentalStatus !== 'not-for-rent',
              },
            },
          ],
        },

        {
          label: 'Media',
          fields: [
            {
              name: 'mainImage',
              type: 'upload',
              relationTo: 'media',
              required: true,
            },

            {
              name: 'gallery',
              type: 'array',
              minRows: 0,
              maxRows: 20,
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'alt',
                  type: 'text',
                  localized: true,
                },
              ],
            },

            {
              name: 'videoUrl',
              type: 'text',
              admin: {
                description: 'YouTube, Vimeo or hosted video URL',
              },
            },
          ],
        },
      ],
    },

    {
      name: 'publicVisibility',
      type: 'select',
      required: true,
      defaultValue: 'public',
      label: 'Public visibility',
      admin: {
        description:
          'Public dresses may remain viewable when sold or temporarily unavailable. Hidden and archived dresses are excluded from every public surface.',
        position: 'sidebar',
      },
      options: [
        {
          label: 'Public',
          value: 'public',
        },
        {
          label: 'Hidden',
          value: 'hidden',
        },
        {
          label: 'Archived',
          value: 'archived',
        },
      ],
    },
  ],
}
