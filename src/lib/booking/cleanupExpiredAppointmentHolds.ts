import type { Payload, PayloadRequest } from 'payload'

import { getExpiryTime } from '@/lib/booking/appointmentHold'
import { appointmentPaymentContext } from '@/lib/booking/paymentIntegrity'
import type { Appointment } from '@/payload-types'

export const expiredHoldCleanupBatchSize = 100

type ExpiredHoldCandidate = Pick<
  Appointment,
  'holdExpiresAt' | 'paymentStatus' | 'source' | 'status'
>

export type ExpiredHoldCleanupResult = {
  expired: number
  hasMore: boolean
  scanned: number
  skipped: number
}

export function isExpiredHoldCleanupCandidate(
  appointment: ExpiredHoldCandidate,
  now: Date = new Date(),
): boolean {
  const expiry = getExpiryTime(appointment.holdExpiresAt)
  if (appointment.source !== 'website' || expiry === null || expiry > now.getTime()) {
    return false
  }

  return (
    (appointment.status === 'pending_payment' && appointment.paymentStatus === 'unpaid') ||
    (appointment.status === 'payment_failed' && appointment.paymentStatus === 'failed')
  )
}

function assertBatchSize(batchSize: number): void {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > expiredHoldCleanupBatchSize) {
    throw new Error(`Expired hold cleanup batch size must be from 1 to ${expiredHoldCleanupBatchSize}.`)
  }
}

async function findCurrentAppointment(
  payload: Payload,
  req: PayloadRequest,
  appointmentId: string,
): Promise<Appointment | null> {
  const result = await payload.find({
    collection: 'appointments',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: { id: { equals: appointmentId } },
  })

  return result.docs[0] ?? null
}

export async function cleanupExpiredAppointmentHolds({
  batchSize = expiredHoldCleanupBatchSize,
  now = new Date(),
  payload,
  req,
}: {
  batchSize?: number
  now?: Date
  payload: Payload
  req: PayloadRequest
}): Promise<ExpiredHoldCleanupResult> {
  assertBatchSize(batchSize)
  if (Number.isNaN(now.getTime())) {
    throw new Error('Expired hold cleanup requires a valid current time.')
  }

  const cutoff = now.toISOString()
  const candidates = await payload.find({
    collection: 'appointments',
    depth: 0,
    limit: batchSize,
    overrideAccess: true,
    req,
    sort: 'holdExpiresAt',
    where: {
      and: [
        { source: { equals: 'website' } },
        { holdExpiresAt: { less_than_equal: cutoff } },
        {
          or: [
            {
              and: [
                { status: { equals: 'pending_payment' } },
                { paymentStatus: { equals: 'unpaid' } },
              ],
            },
            {
              and: [
                { status: { equals: 'payment_failed' } },
                { paymentStatus: { equals: 'failed' } },
              ],
            },
          ],
        },
      ],
    },
  })

  let expired = 0
  let skipped = 0

  for (const candidate of candidates.docs) {
    const current = await findCurrentAppointment(payload, req, String(candidate.id))
    if (!current || !isExpiredHoldCleanupCandidate(current, now)) {
      skipped += 1
      continue
    }

    const updated = await payload.update({
      collection: 'appointments',
      id: current.id,
      context: appointmentPaymentContext('internal-maintenance'),
      data: {
        checkoutExpiresAt: null,
        status: 'expired',
        stripeCheckoutSessionId: null,
      },
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (updated.slotLock) {
      throw new Error('Expired hold cleanup could not release an appointment slot lock.')
    }

    expired += 1
  }

  return {
    expired,
    hasMore: candidates.hasNextPage,
    scanned: candidates.docs.length,
    skipped,
  }
}
