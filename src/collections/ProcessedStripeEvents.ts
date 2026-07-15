import type { CollectionConfig } from 'payload'

import { ownerOnly } from '@/access/roles'

const denyAccess = () => false

export const ProcessedStripeEvents: CollectionConfig = {
  slug: 'processed-stripe-events',
  labels: {
    singular: 'Processed Stripe event',
    plural: 'Processed Stripe events',
  },
  access: {
    admin: ownerOnly,
    create: denyAccess,
    delete: denyAccess,
    read: ownerOnly,
    update: denyAccess,
  },
  admin: {
    defaultColumns: ['eventId', 'eventType', 'status', 'processedAt'],
    group: 'Bookings',
    useAsTitle: 'eventId',
  },
  fields: [
    {
      name: 'eventId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'eventType',
      type: 'text',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Processing', value: 'processing' },
        { label: 'Processed', value: 'processed' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'appointment',
      type: 'relationship',
      relationTo: 'appointments',
    },
    {
      name: 'processedAt',
      type: 'date',
    },
    {
      name: 'failureReason',
      type: 'text',
      maxLength: 200,
    },
  ],
  timestamps: true,
}
