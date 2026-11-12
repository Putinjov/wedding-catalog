import { setTimeout as delay } from 'node:timers/promises'

import { ValidationError, type Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createVerificationClaim } from '@/lib/customers/verificationClaims'

vi.mock('node:timers/promises', () => {
  const setTimeout = vi.fn().mockResolvedValue(undefined)
  return { default: { setTimeout }, setTimeout }
})

function writeConflict() {
  return Object.assign(new Error('Synthetic write conflict'), {
    code: 112,
    errorLabels: ['TransientTransactionError'],
  })
}

function duplicateClaim() {
  return new ValidationError({ errors: [{ path: 'claimKey', message: 'Value must be unique' }] })
}

function fixture() {
  const create = vi.fn().mockResolvedValue({ id: 'synthetic-claim' })
  return { create, payload: { create } as unknown as Payload }
}

describe('verification claim transaction retries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a claim without retrying a successful operation', async () => {
    const { create, payload } = fixture()
    await expect(createVerificationClaim(payload, 'synthetic-key')).resolves.toBe(true)
    expect(create).toHaveBeenCalledTimes(1)
    expect(delay).not.toHaveBeenCalled()
  })

  it('retries an aborted write conflict with the same claim and expiry', async () => {
    const { create, payload } = fixture()
    create.mockRejectedValueOnce(writeConflict())
    await expect(createVerificationClaim(payload, 'synthetic-key')).resolves.toBe(true)
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[1]).toEqual(create.mock.calls[0])
    expect(create.mock.calls[0][0]).toMatchObject({
      collection: 'customer-verification-claims',
      data: { claimKey: 'synthetic-key' },
      depth: 0,
      overrideAccess: true,
    })
    expect(delay).toHaveBeenCalledExactlyOnceWith(25)
  })

  it('returns false when the winning concurrent request has already claimed the key', async () => {
    const { create, payload } = fixture()
    create.mockRejectedValueOnce(writeConflict()).mockRejectedValueOnce(duplicateClaim())
    await expect(createVerificationClaim(payload, 'synthetic-key')).resolves.toBe(false)
    expect(create).toHaveBeenCalledTimes(2)
    expect(delay).toHaveBeenCalledTimes(1)
  })

  it('does not retry an existing duplicate claim', async () => {
    const { create, payload } = fixture()
    create.mockRejectedValueOnce(duplicateClaim())
    await expect(createVerificationClaim(payload, 'synthetic-key')).resolves.toBe(false)
    expect(create).toHaveBeenCalledTimes(1)
    expect(delay).not.toHaveBeenCalled()
  })

  it('stops after three attempts and propagates the last conflict', async () => {
    const { create, payload } = fixture()
    const error = writeConflict()
    create.mockRejectedValue(error)
    await expect(createVerificationClaim(payload, 'synthetic-key')).rejects.toBe(error)
    expect(create).toHaveBeenCalledTimes(3)
    expect(delay).toHaveBeenNthCalledWith(1, 25)
    expect(delay).toHaveBeenNthCalledWith(2, 50)
    expect(delay).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['unlabelled write conflict', Object.assign(new Error('Synthetic'), { code: 112 })],
    ['other transient failure', Object.assign(new Error('Synthetic'), { code: 251, errorLabels: ['TransientTransactionError'] })],
    ['unknown commit result', Object.assign(writeConflict(), { errorLabels: ['TransientTransactionError', 'UnknownTransactionCommitResult'] })],
    ['authentication failure', Object.assign(new Error('Synthetic'), { code: 18 })],
    ['network failure', new Error('Synthetic network failure')],
    ['unrelated validation error', new ValidationError({ errors: [{ path: 'expiresAt', message: 'Invalid date' }] })],
  ])('does not retry or hide %s', async (_name, error) => {
    const { create, payload } = fixture()
    create.mockRejectedValue(error)
    await expect(createVerificationClaim(payload, 'synthetic-key')).rejects.toBe(error)
    expect(create).toHaveBeenCalledTimes(1)
    expect(delay).not.toHaveBeenCalled()
  })
})
