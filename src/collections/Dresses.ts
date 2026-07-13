import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

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
      'availabilityStatus',
      'salePrice',
      'rentalPrice',
      'updatedAt',
    ],
    group: 'Catalog',
  },

  access: {
    read: () => true,
  },

  versions: {
    drafts: true,
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
            }),

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
          label: 'Sale & Rental',
          fields: [
            {
              name: 'availabilityStatus',
              type: 'select',
              required: true,
              defaultValue: 'available',
              options: [
                {
                  label: 'Available',
                  value: 'available',
                },
                {
                  label: 'Reserved',
                  value: 'reserved',
                },
                {
                  label: 'Rented',
                  value: 'rented',
                },
                {
                  label: 'Sold',
                  value: 'sold',
                },
                {
                  label: 'Cleaning',
                  value: 'cleaning',
                },
                {
                  label: 'Repair',
                  value: 'repair',
                },
                {
                  label: 'Hidden',
                  value: 'hidden',
                },
              ],
            },

            {
              name: 'forSale',
              type: 'checkbox',
              defaultValue: true,
            },

            {
              name: 'salePrice',
              type: 'number',
              min: 0,
              admin: {
                condition: (_, siblingData) => siblingData?.forSale === true,
                step: 0.01,
              },
            },

            {
              name: 'previousSalePrice',
              type: 'number',
              min: 0,
              admin: {
                condition: (_, siblingData) => siblingData?.forSale === true,
                description: 'Optional original price shown before discount',
                step: 0.01,
              },
            },

            {
              name: 'availableForRent',
              type: 'checkbox',
              defaultValue: false,
            },

            {
              name: 'rentalPrice',
              type: 'number',
              min: 0,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.availableForRent === true,
                step: 0.01,
              },
            },

            {
              name: 'securityDeposit',
              type: 'number',
              min: 0,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.availableForRent === true,
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
                  siblingData?.availableForRent === true,
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
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}