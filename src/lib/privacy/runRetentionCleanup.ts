import { APIError, type Payload } from 'payload'

import { privacyRetention } from '@/config/privacy'
import { cleanupUnpaidCustomer } from './cleanupUnpaidCancellations'

const batchSize = 100
const maxScanned = 1000
const cursorKey = 'privacy-retention-cursor'

function isTransientTransactionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; hasErrorLabel?: (label: string) => boolean }
  return [24, 112, 251].includes(Number(candidate.code)) ||
    (typeof candidate.hasErrorLabel === 'function' && candidate.hasErrorLabel('TransientTransactionError'))
}

async function cleanupWithRetry(payload: Payload, appointmentId: string, now: Date) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await cleanupUnpaidCustomer({ payload, appointmentId, now })
    } catch (error) {
      if (error instanceof APIError && error.status === 404) return 'skipped'
      if (!isTransientTransactionError(error) || attempt === 2) throw error
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)))
    }
  }
  throw new Error('Retention retry limit reached.')
}

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
  const savedCursor = await payload.kv.get<string>(cursorKey)
  let lastId: string | undefined = savedCursor ?? undefined
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
          { marketingConsentStatus: { not_equals: 'granted' } },
          {
            or: [
              { and: [{ status: { equals: 'expired' } }, { updatedAt: { less_than_equal: unpaidCutoff } }] },
              { and: [{ status: { equals: 'cancelled' } }, { or: [
                { cancelledAt: { less_than_equal: cancelledCutoff } },
                { and: [{ cancelledAt: { equals: null } }, { updatedAt: { less_than_equal: cancelledCutoff } }] },
              ] }] },
              { and: [{ status: { equals: 'completed' } }, { endAt: { less_than_equal: completedCutoff.toISOString() } }] },
            ],
          },
        ],
      },
    })
    if (!batch.docs.length) {
      await payload.kv.delete(cursorKey)
      break
    }
    for (const appointment of batch.docs) {
      const result = await cleanupWithRetry(payload, appointment.id, now)
      if (result === 'removed') removed += 1
    }
    scanned += batch.docs.length
    lastId = batch.docs.at(-1)?.id
    hasMore = batch.hasNextPage
    if (hasMore && lastId) {
      await payload.kv.set(cursorKey, lastId)
    } else {
      await payload.kv.delete(cursorKey)
      break
    }
  }
  return { scanned, removed, hasMore }
}
