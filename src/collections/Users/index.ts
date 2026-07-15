import type { CollectionConfig } from 'payload'

import { ownerFieldOnly, ownerOnly, ownerOrFirstUser, userRoles } from '../../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ownerOnly,
    create: ownerOrFirstUser,
    delete: ownerOnly,
    read: ownerOnly,
    update: ownerOnly,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      access: {
        create: ({ req }) => !req.user || ownerFieldOnly({ req }),
        update: ownerFieldOnly,
      },
      admin: {
        description: 'Owners manage users; managers manage bookings and catalogue; staff use the calendar.',
        position: 'sidebar',
      },
      defaultValue: 'owner',
      options: userRoles.map((role) => ({
        label: role.charAt(0).toUpperCase() + role.slice(1),
        value: role,
      })),
      required: true,
      saveToJWT: true,
    },
  ],
  timestamps: true,
}
