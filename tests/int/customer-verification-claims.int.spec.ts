import { randomUUID } from 'node:crypto'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { describe, expect, it } from 'vitest'

import { createVerificationClaim } from '@/lib/customers/verificationClaims'

describe('persistent one-time email claims', () => {
  it('permits exactly one redemption even when submissions race', async () => {
    const payload = await getPayload({ config: configPromise })
    const claimKey = `test:${randomUUID()}`
    const results = await Promise.all([
      createVerificationClaim(payload, claimKey),
      createVerificationClaim(payload, claimKey),
    ])
    expect(results.sort()).toEqual([false, true])

    const claim = await payload.find({
      collection: 'customer-verification-claims',
      limit: 2,
      overrideAccess: true,
      where: { claimKey: { equals: claimKey } },
    })
    expect(claim.docs).toHaveLength(1)
    await payload.delete({
      collection: 'customer-verification-claims',
      id: claim.docs[0].id,
      overrideAccess: true,
    })
  })
})
