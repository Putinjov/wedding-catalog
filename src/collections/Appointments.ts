import { randomBytes } from 'node:crypto'

import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { bookingConfig } from '@/config/booking'
import { siteConfig } from '@/config/site'

export function createPublicReference(): string {
  return `fit_${randomBytes(16).toString('hex')}`
}

export const Appointments: CollectionConfig = {
  slug: 'appointments',
  labels: {
    singular: 'Appointment',
    plural: 'Appointments',
  },
  admin: {
    defaultColumns: [
      'customerName',
      'startAt',
      'purpose',
      'status',
      'paymentStatus',
      'fittingFee',
    ],
    group: 'Bookings',
    useAsTitle: 'customerName',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation !== 'create' || !data) {
          return data
        }

        const startAt = data.startAt ? new Date(data.startAt) : null
        const endAt =
          startAt && !Number.isNaN(startAt.getTime())
            ? new Date(startAt.getTime() + bookingConfig.durationMinutes * 60 * 1000).toISOString()
            : data.endAt

        return {
          ...data,
          currency: data.currency ?? siteConfig.currency,
          endAt,
          fittingFee: data.fittingFee ?? siteConfig.fittingFee,
          paymentStatus: data.paymentStatus ?? 'unpaid',
          publicReference: data.publicReference ?? createPublicReference(),
          source: data.source ?? 'website',
          status: data.status ?? 'pending',
        }
      },
    ],
  },
  fields: [
    {
      name: 'publicReference',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Private-safe reference used on the pending payment page.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'purpose',
      type: 'select',
      required: true,
      options: [
        { label: 'Buy', value: 'buy' },
        { label: 'Rent', value: 'rent' },
      ],
    },
    {
      name: 'dress',
      type: 'relationship',
      relationTo: 'dresses',
    },
    {
      name: 'customerName',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
    },
    {
      name: 'notes',
      type: 'textarea',
      maxLength: 1000,
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
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Completed', value: 'completed' },
        { label: 'No-show', value: 'no-show' },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'unpaid',
      required: true,
      options: [
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'fittingFee',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: siteConfig.fittingFee,
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: siteConfig.currency,
      required: true,
      options: [{ label: 'EUR', value: 'EUR' }],
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'website',
      required: true,
      options: [
        { label: 'Website', value: 'website' },
        { label: 'Admin', value: 'admin' },
      ],
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
