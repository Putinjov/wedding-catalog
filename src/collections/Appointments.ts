import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { bookingConfig } from '@/config/booking'
import { siteConfig } from '@/config/site'
import { appointmentCalendarEndpoints } from '@/lib/admin/appointments/endpoints'
import {
  assertAppointmentStatusTransition,
  getStatusTransitionOptions,
} from '@/lib/admin/appointments/updateAppointmentStatus'
import { hasAppointmentSlotConflict } from '@/lib/booking/hasAppointmentSlotConflict'
import { createPublicReference } from '@/lib/booking/createPublicReference'
import type { Appointment } from '@/payload-types'

const validateStatusChange: CollectionBeforeChangeHook<Appointment> = async ({
  context,
  data,
  operation,
  originalDoc,
  req,
}) => {
  const nextStatus = data.status
  const options = getStatusTransitionOptions(context)
  if (operation === 'create' && nextStatus && nextStatus !== 'pending') {
    assertAppointmentStatusTransition({
      appointment: {
        endAt: data.endAt ?? new Date().toISOString(),
        paymentStatus: data.paymentStatus ?? 'unpaid',
        source: data.source ?? 'website',
        status: 'pending',
      },
      nextStatus,
      options,
    })
  } else if (operation === 'update' && originalDoc && nextStatus && nextStatus !== originalDoc.status) {
    assertAppointmentStatusTransition({
      appointment: {
        endAt: data.endAt ?? originalDoc.endAt,
        paymentStatus: data.paymentStatus ?? originalDoc.paymentStatus,
        source: data.source ?? originalDoc.source,
        status: originalDoc.status,
      },
      nextStatus,
      options,
    })
  }

  const effectiveStatus = nextStatus ?? originalDoc?.status ?? 'pending'
  const scheduleChanged =
    operation === 'create' ||
    (operation === 'update' &&
      originalDoc &&
      ((data.startAt && data.startAt !== originalDoc.startAt) ||
        (data.endAt && data.endAt !== originalDoc.endAt) ||
        (originalDoc.status === 'cancelled' && effectiveStatus === 'pending')))
  const startAt = data.startAt ?? originalDoc?.startAt
  const endAt = data.endAt ?? originalDoc?.endAt

  if (
    scheduleChanged &&
    effectiveStatus !== 'cancelled' &&
    startAt &&
    endAt &&
    (await hasAppointmentSlotConflict(req.payload, {
      endAt,
      id: originalDoc?.id,
      startAt,
    }))
  ) {
    throw new APIError('This appointment overlaps another active appointment.', 400)
  }

  return data
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
      'amountPaid',
      'publicReference',
    ],
    group: false,
    useAsTitle: 'customerName',
  },
  endpoints: appointmentCalendarEndpoints,
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  hooks: {
    beforeChange: [validateStatusChange],
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
      admin: {
        description: 'Confirmed means the fitting payment has been verified by Stripe.',
      },
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
      admin: {
        description: 'Online payment covers the private fitting fee only; dress buy/rent is in store.',
        position: 'sidebar',
      },
      options: [
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'stripeCheckoutSessionId',
      type: 'text',
      unique: true,
      admin: {
        description: 'Read-only Stripe Checkout Session used for the fitting fee.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      admin: {
        description: 'Read-only Stripe PaymentIntent for the fitting fee.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'fittingFee',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: siteConfig.fittingFee,
    },
    {
      name: 'amountPaid',
      type: 'number',
      min: 0,
      admin: {
        description: 'Paid fitting fee in integer cents. Online payment covers fitting only.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'paidAt',
      type: 'date',
      admin: {
        description: 'Set only after Stripe verifies the fitting payment.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'stripeCustomerEmail',
      type: 'email',
      admin: {
        description: 'Email returned by Stripe for the fitting payment.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'paymentFailureReason',
      type: 'text',
      admin: {
        description: 'Safe internal reason for a failed fitting payment.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'checkoutExpiresAt',
      type: 'date',
      admin: {
        description: 'Expiration time of the active fitting Checkout Session.',
        position: 'sidebar',
        readOnly: true,
      },
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
