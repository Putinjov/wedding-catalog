import type { CollectionConfig } from 'payload'

import { ownerOrManager } from '@/access/roles'
import {
  appointmentEmailEventValues,
  emailDeliveryStatusValues,
} from '@/lib/notifications/types'

const systemOnly = () => false

export const EmailDeliveries: CollectionConfig = {
  slug: 'email-deliveries',
  access: {
    admin: ownerOrManager,
    create: systemOnly,
    delete: systemOnly,
    read: ownerOrManager,
    update: systemOnly,
  },
  admin: {
    defaultColumns: ['event', 'status', 'appointment', 'attempts', 'createdAt'],
    description: 'Privacy-minimised appointment email delivery state. Message bodies are never stored.',
    group: 'System',
    useAsTitle: 'idempotencyKey',
  },
  fields: [
    {
      name: 'appointment',
      type: 'relationship',
      index: true,
      relationTo: 'appointments',
      required: true,
    },
    {
      name: 'event',
      type: 'select',
      options: appointmentEmailEventValues.map((value) => ({
        label: value.replaceAll('_', ' '),
        value,
      })),
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'queued',
      index: true,
      options: emailDeliveryStatusValues.map((value) => ({
        label: value,
        value,
      })),
      required: true,
    },
    {
      name: 'idempotencyKey',
      type: 'text',
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'trigger',
      type: 'select',
      options: [
        { label: 'Automatic', value: 'automatic' },
        { label: 'Manual resend', value: 'manual' },
      ],
      required: true,
    },
    {
      name: 'attempts',
      type: 'number',
      defaultValue: 0,
      min: 0,
      required: true,
    },
    {
      name: 'jobId',
      type: 'text',
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'lastFailureReason',
      type: 'text',
      admin: {
        description: 'Sanitised operational category only; provider responses and addresses are excluded.',
        readOnly: true,
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'requestedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
