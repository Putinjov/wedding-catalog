import type { CollectionConfig } from 'payload'

import { ownerOnly } from '@/access/roles'

const denyAccess = () => false

export const AppointmentSlotLocks: CollectionConfig = {
  slug: 'appointment-slot-locks',
  access: {
    admin: ownerOnly,
    create: denyAccess,
    delete: denyAccess,
    read: ownerOnly,
    update: denyAccess,
  },
  admin: {
    hidden: true,
  },
  fields: [
    {
      name: 'slotKey',
      type: 'text',
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'startAt',
      type: 'date',
      required: true,
    },
    {
      name: 'endAt',
      type: 'date',
      required: true,
    },
    {
      name: 'expiresAt',
      type: 'date',
    },
  ],
  timestamps: true,
}
