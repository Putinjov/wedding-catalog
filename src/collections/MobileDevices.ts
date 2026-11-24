import type { CollectionConfig } from 'payload'

const systemOnly = () => false

// Retained solely for historical migration compatibility. No registration endpoints.
export const MobileDevices: CollectionConfig = {
  slug: 'mobile-devices',
  access: {
    admin: systemOnly,
    create: systemOnly,
    delete: systemOnly,
    read: systemOnly,
    update: systemOnly,
  },
  admin: {
    defaultColumns: ['deviceName', 'platform', 'user', 'notificationsEnabled', 'lastSeenAt'],
    hidden: true,
    description: 'Retired device registration storage, retained for migration compatibility.',
    group: 'System',
    useAsTitle: 'deviceName',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      index: true,
      relationTo: 'users',
      required: true,
    },
    {
      name: 'expoPushToken',
      type: 'text',
      index: true,
      required: true,
      unique: true,
      admin: { readOnly: true },
    },
    {
      name: 'platform',
      type: 'select',
      options: [
        { label: 'iOS', value: 'ios' },
        { label: 'Android', value: 'android' },
      ],
      required: true,
    },
    {
      name: 'deviceName',
      type: 'text',
      maxLength: 120,
    },
    {
      name: 'notificationsEnabled',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      required: true,
    },
    {
      name: 'lastSeenAt',
      type: 'date',
      index: true,
      required: true,
    },
  ],
  timestamps: true,
}
