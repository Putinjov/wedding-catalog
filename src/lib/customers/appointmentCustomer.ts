import { APIError, NotFound, type CollectionBeforeChangeHook } from 'payload'

import type { Appointment } from '@/payload-types'

import { normalizeCustomerEmail } from './email'

function getCustomerId(value: Appointment['customer']): string | null {
  if (!value) return null
  return String(typeof value === 'object' ? value.id : value)
}

export const validateAppointmentCustomer: CollectionBeforeChangeHook<Appointment> = async ({
  data,
  originalDoc,
  req,
}) => {
  const customerId = getCustomerId(
    data.customer === undefined ? originalDoc?.customer : data.customer,
  )
  if (!customerId) return data

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

  return data
}
