import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return { ...actual, getPayload: mocks.getPayload }
})

import { GET } from '@/app/(frontend)/api/cron/expired-holds/route'

function createPayloadFixture(runStatus: 'error' | 'error-reached-max-retries' | 'success') {
  return {
    jobs: {
      queue: vi.fn(async () => ({ id: 'job-1' })),
      runByID: vi.fn(async () => ({
        jobStatus: { 'job-1': { status: runStatus } },
      })),
    },
    logger: {
      error: vi.fn(),
    },
  }
}

describe('expired holds cron route', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'cron-secret-at-least-24-characters')
    mocks.getPayload.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('rejects requests without the cron bearer secret before loading Payload', async () => {
    const response = await GET(new Request('http://localhost/api/cron/expired-holds'))

    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    await expect(response.json()).resolves.toEqual({ status: 'unauthorized' })
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('reports an unconfigured cron secret without loading Payload', async () => {
    vi.stubEnv('CRON_SECRET', '')

    const response = await GET(new Request('http://localhost/api/cron/expired-holds'))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ status: 'unconfigured' })
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('queues and runs one bounded maintenance job for an authorised request', async () => {
    const payload = createPayloadFixture('success')
    mocks.getPayload.mockResolvedValue(payload)

    const response = await GET(
      new Request('http://localhost/api/cron/expired-holds', {
        headers: { authorization: 'Bearer cron-secret-at-least-24-characters' },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ jobId: 'job-1', status: 'ok' })
    expect(payload.jobs.queue).toHaveBeenCalledWith({
      input: {},
      overrideAccess: true,
      queue: 'booking-maintenance',
      task: 'cleanupExpiredAppointmentHolds',
    })
    expect(payload.jobs.runByID).toHaveBeenCalledWith({ id: 'job-1', overrideAccess: true })
  })

  it('returns a visible failure when the queued job fails', async () => {
    const payload = createPayloadFixture('error-reached-max-retries')
    mocks.getPayload.mockResolvedValue(payload)

    const response = await GET(
      new Request('http://localhost/api/cron/expired-holds', {
        headers: { authorization: 'Bearer cron-secret-at-least-24-characters' },
      }),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ jobId: 'job-1', status: 'failed' })
    expect(payload.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        job: 'cleanupExpiredAppointmentHolds',
        jobId: 'job-1',
        runStatus: 'error-reached-max-retries',
      }),
    )
  })

  it('emits a sanitized structured alert when setup fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.getPayload.mockRejectedValue(new Error('sensitive provider detail'))

    const response = await GET(
      new Request('http://localhost/api/cron/expired-holds', {
        headers: { authorization: 'Bearer cron-secret-at-least-24-characters' },
      }),
    )

    expect(response.status).toBe(500)
    const logged = consoleError.mock.calls.flat().join(' ')
    expect(logged).toContain('Expired hold cron invocation failed before completion.')
    expect(logged).not.toContain('sensitive provider detail')
    expect(logged).not.toContain('cron-secret-at-least-24-characters')
  })
})
