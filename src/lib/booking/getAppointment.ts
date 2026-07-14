import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Appointment } from '@/payload-types'

const publicReferencePattern = /^fit_[a-f0-9]{32}$/

export async function getAppointmentByReference(reference: string): Promise<Appointment | null> {
  if (!publicReferencePattern.test(reference)) {
    return null
  }

  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'appointments',
    depth: 1,
    limit: 1,
    pagination: false,
    where: {
      publicReference: {
        equals: reference,
      },
    },
  })

  return result.docs[0] ?? null
}
