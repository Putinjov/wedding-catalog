import type { CollectionConfig } from 'payload'

import { ownerOnly } from '@/access/roles'

const denyAccess = () => false

export const AppointmentAudits: CollectionConfig = {
  slug: 'appointment-audits',
  labels: {
    singular: 'Appointment audit',
    plural: 'Appointment audits',
  },
  access: {
    admin: ownerOnly,
    create: denyAccess,
    delete: denyAccess,
    read: ownerOnly,
    update: denyAccess,
  },
  admin: {
    defaultColumns: ['timestamp', 'action', 'appointment', 'actorType'],
    description: 'Owner-only immutable appointment history for operational and payment review.',
    group: 'Administration',
    useAsTitle: 'action',
  },
  fields: [
    {
      name: 'appointment',
      type: 'relationship',
      relationTo: 'appointments',
      required: true,
      index: true,
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'actorType',
      type: 'select',
      required: true,
      options: [
        { label: 'User', value: 'user' },
        { label: 'Stripe', value: 'stripe' },
        { label: 'Public booking', value: 'public' },
        { label: 'System', value: 'system' },
      ],
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'action',
      type: 'text',
      required: true,
    },
    {
      name: 'previousStatus',
      type: 'text',
    },
    {
      name: 'newStatus',
      type: 'text',
    },
    {
      name: 'metadata',
      type: 'json',
    },
  ],
  timestamps: false,
}
