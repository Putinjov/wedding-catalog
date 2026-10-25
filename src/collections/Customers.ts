import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
} from 'payload'

import { appointmentTeam, ownerOnly, ownerOrManager } from '@/access/roles'
import { normalizeCustomerEmail } from '@/lib/customers/email'
import type { Customer } from '@/payload-types'

const confirmedOrderStatuses = new Set(['awaiting_dress', 'ready_for_collection', 'fulfilled'])

export const validateCustomer: CollectionBeforeChangeHook<Customer> = ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation === 'update' && data.email && originalDoc) {
    if (normalizeCustomerEmail(data.email) !== originalDoc.email) {
      throw new APIError('A customer email cannot be changed after profile creation.', 400)
    }
  }

  const orderStatus =
    data.orderStatus === undefined ? (originalDoc?.orderStatus ?? 'none') : data.orderStatus
  const purchaseConfirmedAt =
    data.purchaseConfirmedAt === undefined
      ? originalDoc?.purchaseConfirmedAt
      : data.purchaseConfirmedAt
  if (confirmedOrderStatuses.has(orderStatus) && !purchaseConfirmedAt) {
    throw new APIError('A confirmed order requires its purchase confirmation date.', 400)
  }
  if (!confirmedOrderStatuses.has(orderStatus) && purchaseConfirmedAt) {
    throw new APIError('Purchase confirmation requires a confirmed order status.', 400)
  }
  return data
}

export const preventLinkedCustomerDeletion: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const linked = await req.payload.count({
    collection: 'appointments',
    where: { customer: { equals: id } },
    overrideAccess: true,
    req,
  })
  if (linked.totalDocs > 0) {
    throw new APIError('Unlink appointments before deleting this customer profile.', 400)
  }
}

export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Customer', plural: 'Customers' },
  admin: {
    defaultColumns: ['name', 'email', 'orderStatus', 'purchaseConfirmedAt', 'updatedAt'],
    description:
      'Private staff-only profiles. Historical appointments are not linked automatically.',
    group: 'Bookings',
    useAsTitle: 'name',
  },
  access: {
    admin: appointmentTeam,
    create: ownerOrManager,
    delete: ownerOnly,
    read: appointmentTeam,
    update: ownerOrManager,
  },
  hooks: {
    beforeChange: [validateCustomer],
    beforeDelete: [preventLinkedCustomerDeletion],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [
          ({ value }) => (typeof value === 'string' ? normalizeCustomerEmail(value) : value),
        ],
      },
      admin: {
        description:
          'Stable private identity key; changes require a reviewed account-linking workflow.',
      },
    },
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    { name: 'phone', type: 'text', maxLength: 40 },
    {
      name: 'orderStatus',
      type: 'select',
      required: true,
      defaultValue: 'none',
      options: [
        { label: 'No order', value: 'none' },
        { label: 'Order awaiting deposit', value: 'awaiting_deposit' },
        { label: 'Deposit received — awaiting dress', value: 'awaiting_dress' },
        { label: 'Dress ready for collection', value: 'ready_for_collection' },
        { label: 'Order fulfilled', value: 'fulfilled' },
      ],
      admin: {
        description:
          'Internal manual order progress; this field alone does not change booking fees.',
      },
    },
    {
      name: 'purchaseConfirmedAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Record only after the order is confirmed and the deposit is received. This closes online booking; arrange later fittings by phone.',
      },
    },
    {
      name: 'orderReference',
      type: 'text',
      maxLength: 120,
      admin: { description: 'Optional internal order reference. Never shown to customers.' },
    },
  ],
  timestamps: true,
}
