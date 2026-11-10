import { setTimeout as delay } from 'node:timers/promises'

import { ValidationError, type Payload } from 'payload'

const claimRetentionMs = 24 * 60 * 60 * 1000
const maxClaimAttempts = 3

function isRetryableWriteConflict(error: unknown): boolean {
  return error instanceof Error &&
    'code' in error && error.code === 112 &&
    'errorLabels' in error && Array.isArray(error.errorLabels) &&
    error.errorLabels.includes('TransientTransactionError') &&
    !error.errorLabels.includes('UnknownTransactionCommitResult')
}

export function isDuplicateClaim(error: unknown): boolean {
  return error instanceof ValidationError &&
    error.data.errors.some((field) =>
      field.path === 'claimKey' && /unique/i.test(field.message))
}

export async function createVerificationClaim(payload: Payload, claimKey: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + claimRetentionMs).toISOString()

  for (let attempt = 1; ; attempt += 1) {
    try {
      await payload.create({
        collection: 'customer-verification-claims',
        data: { claimKey, expiresAt },
        depth: 0,
        overrideAccess: true,
      })
      return true
    } catch (error) {
      if (isDuplicateClaim(error)) return false
      if (attempt >= maxClaimAttempts || !isRetryableWriteConflict(error)) throw error

      // Payload has rolled back this independent create before rejecting it.
      // Start a fresh transaction; the unique index still decides the winner.
      await delay(25 * attempt)
    }
  }
}
