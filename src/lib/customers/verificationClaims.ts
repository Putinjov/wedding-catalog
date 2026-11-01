import { ValidationError, type Payload } from 'payload'

const claimRetentionMs = 24 * 60 * 60 * 1000

export function isDuplicateClaim(error: unknown): boolean {
  return error instanceof ValidationError &&
    error.data.errors.some((field) =>
      field.path === 'claimKey' && /unique/i.test(field.message))
}

export async function createVerificationClaim(payload: Payload, claimKey: string): Promise<boolean> {
  try {
    await payload.create({
      collection: 'customer-verification-claims',
      data: { claimKey, expiresAt: new Date(Date.now() + claimRetentionMs).toISOString() },
      depth: 0,
      overrideAccess: true,
    })
    return true
  } catch (error) {
    if (isDuplicateClaim(error)) return false
    throw error
  }
}
