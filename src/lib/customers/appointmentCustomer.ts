import { APIError, NotFound, type CollectionBeforeChangeHook } from 'payload'

import { siteConfig } from '@/config/site'
import type { Appointment } from '@/payload-types'

import { normalizeCustomerEmail } from './email'
import { resolveRepeatBookingDecision } from './repeatBooking'

function getCustomerId(value: Appointment['customer']): string | null {
  if (!value) return null
  return String(typeof value === 'object' ? value.id : value)
}

export const validateAppointmentCustomer: CollectionBeforeChangeHook<Appointment> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const customerId = getCustomerId(
    data.customer === undefined ? originalDoc?.customer : data.customer,
  )
  if (!customerId) {
    if (operation === 'create' && data.source === 'website') {
      throw new APIError('A verified customer profile is required for online booking.', 400)
    }
    return data
  }

  const email = data.email ?? originalDoc?.email
  if (!email) throw new APIError('An appointment email is required for a customer profile.', 400)

  let customerEmail: string
  try {
    const customer = await req.payload.findByID({
      collection: 'customers',
      id: customerId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    customerEmail = customer.email
  } catch (error) {
    if (error instanceof NotFound) {
      throw new APIError('The customer profile could not be verified.', 400)
    }
    throw error
  }

  if (normalizeCustomerEmail(email) !== normalizeCustomerEmail(customerEmail)) {
    throw new APIError('The customer profile must match the appointment email.', 400)
  }

  if (operation === 'create' && data.source === 'website') {
    const startAt = data.startAt ? new Date(data.startAt) : null
    if (!startAt || Number.isNaN(startAt.getTime())) {
      throw new APIError('A valid fitting time is required.', 400)
    }
    const decision = await resolveRepeatBookingDecision({
      email,
      now: new Date(),
      payload: req.payload,
      req,
      requestedAt: startAt,
    })
    if (!decision.customer || String(decision.customer.id) !== customerId) {
      throw new APIError('The verified customer profile changed. Please try again.', 409)
    }
    if (decision.kind === 'closed') {
      throw new APIError('Online bookings are unavailable after a confirmed purchase.', 409)
    }
    const expectedFee = decision.kind === 'free' ? 0 : siteConfig.fittingFee
    if (data.fittingFee !== expectedFee) {
      throw new APIError('The fitting fee changed. Please review your booking again.', 409)
    }
  }

  return data
}
