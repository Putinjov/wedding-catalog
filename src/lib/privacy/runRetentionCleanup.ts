import { APIError, type Payload } from 'payload'

import { privacyRetention } from '@/config/privacy'
import { cleanupUnpaidCustomer } from './cleanupUnpaidCancellations'

const batchSize = 100
const maxScanned = 1000

export async function runRetentionCleanup(payload: Payload, now = new Date()) {
  const unpaidCutoff = new Date(now.getTime() - privacyRetention.abandonedUnpaidDays * 86_400_000).toISOString()
  const cancelledCutoff = new Date(now.getTime() - privacyRetention.cancelledUnpaidDays * 86_400_000).toISOString()
  const completedCutoff = new Date(now)
  const day = completedCutoff.getUTCDate()
  completedCutoff.setUTCDate(1)
  completedCutoff.setUTCMonth(completedCutoff.getUTCMonth() - privacyRetention.completedOperationalMonths)
  completedCutoff.setUTCDate(Math.min(day, new Date(Date.UTC(completedCutoff.getUTCFullYear(), completedCutoff.getUTCMonth() + 1, 0)).getUTCDate()))

  let scanned = 0
  let removed = 0
  let lastId: string | undefined
  let hasMore = false
  while (scanned < maxScanned) {
    const batch = await payload.find({
      collection: 'appointments',
      depth: 0,
      limit: batchSize,
      sort: 'id',
      overrideAccess: true,
      where: {
        and: [
          ...(lastId ? [{ id: { greater_than: lastId } }] : []),
          { paymentStatus: { in: ['unpaid', 'failed'] } },
          { needsAdminReview: { not_equals: true } },
          { retentionHold: { not_equals: true } },
          { stripeCheckoutSessionId: { exists: false } },
          { stripePaymentIntentId: { exists: false } },
          { stripeRefundId: { exists: false } },
          { marketingConsentStatus: { not_equals: 'granted' } },
          {
            or: [
              { and: [{ status: { equals: 'expired' } }, { updatedAt: { less_than_equal: unpaidCutoff } }] },
              { and: [{ status: { equals: 'cancelled' } }, { or: [
                { cancelledAt: { less_than_equal: cancelledCutoff } },
                { and: [{ cancelledAt: { exists: false } }, { updatedAt: { less_than_equal: cancelledCutoff } }] },
              ] }] },
              { and: [{ status: { equals: 'completed' } }, { endAt: { less_than_equal: completedCutoff.toISOString() } }] },
            ],
          },
        ],
      },
    })
    if (!batch.docs.length) break
    for (const appointment of batch.docs) {
      try {
        const result = await cleanupUnpaidCustomer({ payload, appointmentId: appointment.id, now })
        if (result === 'removed') removed += 1
      } catch (error) {
        // Another related record in this batch may have already been removed.
        if (!(error instanceof APIError && error.status === 404)) throw error
      }
    }
    scanned += batch.docs.length
    lastId = batch.docs.at(-1)?.id
    hasMore = batch.hasNextPage
    if (!hasMore) break
  }
  return { scanned, removed, hasMore }
}
