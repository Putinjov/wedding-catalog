import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'

import { appointmentTeam, ownerOrManager } from '@/access/roles'
import { bookingConfig } from '@/config/booking'
import { siteConfig } from '@/config/site'
import { appointmentCalendarEndpoints } from '@/lib/admin/appointments/endpoints'
import {
  assertAppointmentStatusTransition,
  getStatusTransitionOptions,
} from '@/lib/admin/appointments/updateAppointmentStatus'
import { hasAppointmentSlotConflict } from '@/lib/booking/hasAppointmentSlotConflict'
import { createPublicReference } from '@/lib/booking/createPublicReference'
import {
  acquireAppointmentSlotLock,
  getAppointmentSlotLockId,
  releaseAppointmentSlotLock,
} from '@/lib/booking/appointmentSlotLocks'
import {
  assertProtectedAppointmentFields,
  getAppointmentPaymentContext,
  protectedAppointmentFieldWrite,
} from '@/lib/booking/paymentIntegrity'
import type { Appointment } from '@/payload-types'
import { writeAppointmentAudit } from '@/lib/booking/writeAppointmentAudit'

const validateStatusChange: CollectionBeforeChangeHook<Appointment> = async ({
  context,
  data,
  operation,
  originalDoc,
  req,
}) => {
  assertProtectedAppointmentFields({ context, data, operation, originalDoc })

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
    const paymentContext = getAppointmentPaymentContext(context)
    assertAppointmentStatusTransition({
      appointment: {
        endAt: data.endAt ?? originalDoc.endAt,
        paymentStatus: paymentContext
          ? (data.paymentStatus ?? originalDoc.paymentStatus)
          : originalDoc.paymentStatus,
        source: originalDoc.source,
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

  const existingLockId = getAppointmentSlotLockId(originalDoc?.slotLock)
  if (operation === 'update' && effectiveStatus === 'cancelled' && existingLockId) {
    await releaseAppointmentSlotLock(req, existingLockId)
    data.slotLock = null
  } else if (scheduleChanged && effectiveStatus !== 'cancelled' && startAt && endAt) {
    const nextLockId = await acquireAppointmentSlotLock({
      endAt,
      expiresAt: data.holdExpiresAt ?? originalDoc?.holdExpiresAt,
      req,
      startAt,
    })

    if (existingLockId && existingLockId !== nextLockId) {
      await releaseAppointmentSlotLock(req, existingLockId)
    }
    data.slotLock = nextLockId
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
    admin: appointmentTeam,
    create: appointmentTeam,
    delete: ownerOrManager,
    read: appointmentTeam,
    update: appointmentTeam,
  },
  hooks: {
    afterChange: [writeAppointmentAudit],
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

        const source = data.source ?? 'website'
        return {
          ...data,
          currency: data.currency ?? siteConfig.currency,
          endAt,
          fittingFee: data.fittingFee ?? siteConfig.fittingFee,
          holdExpiresAt:
            data.holdExpiresAt ??
            (source === 'website'
              ? new Date(Date.now() + bookingConfig.holdMinutes * 60 * 1000).toISOString()
              : undefined),
          paymentStatus: data.paymentStatus ?? 'unpaid',
          publicReference: data.publicReference ?? createPublicReference(),
          source,
          status: data.status ?? 'pending',
        }
      },
    ],
  },
  fields: [
    {
      name: 'publicReference',
      type: 'text',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
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
      name: 'slotLock',
      type: 'relationship',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      admin: {
        hidden: true,
        readOnly: true,
      },
      relationTo: 'appointment-slot-locks',
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
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      defaultValue: 'unpaid',
      required: true,
      admin: {
        description: 'Online payment covers the private fitting fee only; dress buy/rent is in store.',
        position: 'sidebar',
        readOnly: true,
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
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
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
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      admin: {
        description: 'Read-only Stripe PaymentIntent for the fitting fee.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'fittingFee',
      type: 'number',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      required: true,
      min: 0,
      defaultValue: siteConfig.fittingFee,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'amountPaid',
      type: 'number',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
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
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      admin: {
        description: 'Set only after Stripe verifies the fitting payment.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'stripeCustomerEmail',
      type: 'email',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      admin: {
        description: 'Email returned by Stripe for the fitting payment.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'paymentFailureReason',
      type: 'text',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      admin: {
        description: 'Safe internal reason for a failed fitting payment.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'checkoutExpiresAt',
      type: 'date',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      admin: {
        description: 'Expiration time of the active fitting Checkout Session.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'holdExpiresAt',
      type: 'date',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      admin: {
        description: 'Unpaid website holds stop blocking the slot after this time.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'currency',
      type: 'select',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      defaultValue: siteConfig.currency,
      required: true,
      admin: {
        readOnly: true,
      },
      options: [{ label: 'EUR', value: 'EUR' }],
    },
    {
      name: 'source',
      type: 'select',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      defaultValue: 'website',
      required: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      options: [
        { label: 'Website', value: 'website' },
        { label: 'Admin', value: 'admin' },
      ],
    },
    {
      name: 'needsAdminReview',
      type: 'checkbox',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      admin: {
        description: 'Set by trusted payment processing when staff action is required.',
        position: 'sidebar',
        readOnly: true,
      },
      defaultValue: false,
    },
    {
      name: 'reviewReason',
      type: 'text',
      access: {
        create: protectedAppointmentFieldWrite,
        update: protectedAppointmentFieldWrite,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
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
