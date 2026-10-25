import type { CollectionConfig } from 'payload'

const systemOnly = () => false

export const CustomerVerificationClaims: CollectionConfig = {
  slug: 'customer-verification-claims',
  access: {
    admin: systemOnly,
    create: systemOnly,
    delete: systemOnly,
    read: systemOnly,
    update: systemOnly,
  },
  admin: { hidden: true },
  fields: [
    { name: 'claimKey', type: 'text', required: true, unique: true, index: true },
    { name: 'expiresAt', type: 'date', required: true },
  ],
  timestamps: true,
}
