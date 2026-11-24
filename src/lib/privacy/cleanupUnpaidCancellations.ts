import { createLocalReq, type Payload, type PayloadRequest } from 'payload'

import type { Appointment, Customer } from '@/payload-types'
import { assessAppointmentRetention } from './assessAppointmentRetention'

const maxRelatedAppointments = 50

function customerID(appointment: Appointment): string | null {
  return typeof appointment.customer === 'object'
    ? appointment.customer?.id ?? null
    : appointment.customer ?? null
}

/**
 * Remove one inactive customer and all their eligible unpaid bookings atomically.
 * All application writes that attach a profile must write that profile in their transaction.
 */
export async function cleanupUnpaidCustomer({
  payload,
  appointmentId,
  now = new Date(),
}: {
  payload: Payload
  appointmentId: string
  now?: Date
}): Promise<'removed' | 'skipped'> {
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Retention requires database transactions.')
  const req: PayloadRequest = await createLocalReq({}, payload)
  req.transactionID = transactionID

  try {
    const current = await payload.findByID({
      collection: 'appointments', id: appointmentId, depth: 0, overrideAccess: true, req,
    })
    const id = customerID(current)
    let customer: Customer | null = null
    if (id) {
      customer = await payload.findByID({
        collection: 'customers', id, depth: 0, overrideAccess: true, req,
      })
      // This write makes simultaneous new bookings and profile edits conflict with cleanup.
      customer = await payload.update({
        collection: 'customers', id, data: { name: customer.name },
        depth: 0, overrideAccess: true, req,
      })
    } else {
      const email = current.email.trim().toLowerCase()
      const existing = await payload.count({
        collection: 'customers', where: { email: { equals: email } }, overrideAccess: true, req,
      })
      if (existing.totalDocs) {
        await payload.db.rollbackTransaction(transactionID)
        return 'skipped'
      }
      // A temporary unique-email profile serializes this cleanup with a new guest booking.
      customer = await payload.create({
        collection: 'customers',
        data: { email, name: current.customerName, phone: current.phone, orderStatus: 'none' },
        depth: 0, overrideAccess: true, req,
      })
    }

    const related = await payload.find({
      collection: 'appointments', depth: 0, limit: maxRelatedAppointments + 1,
      overrideAccess: true, req,
      where: {
        or: [
          { email: { like: current.email } },
          ...(id ? [{ customer: { equals: id } }] : []),
        ],
      },
    })
    if (
      related.totalDocs === 0 ||
      related.totalDocs > maxRelatedAppointments ||
      related.docs.some((appointment) => customerID(appointment) !== id) ||
      related.docs.some((appointment) => !assessAppointmentRetention({ appointment, customer, now }).eligible)
    ) {
      await payload.db.rollbackTransaction(transactionID)
      return 'skipped'
    }

    for (const appointment of related.docs) {
      const where = { appointment: { equals: appointment.id } }
      await payload.delete({ collection: 'email-deliveries', where, overrideAccess: true, req })
      await payload.delete({ collection: 'appointment-audits', where, overrideAccess: true, req })
      await payload.delete({ collection: 'appointments', id: appointment.id, overrideAccess: true, req })
    }
    if (customer) {
      await payload.delete({ collection: 'customers', id: customer.id, overrideAccess: true, req })
    }
    await payload.db.commitTransaction(transactionID)
    return 'removed'
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}
