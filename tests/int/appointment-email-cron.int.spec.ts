import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getPayload: vi.fn() }))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return { ...actual, getPayload: mocks.getPayload }
})

import {
  emailCronBatchSize,
  GET,
} from '@/app/(frontend)/api/cron/email-deliveries/route'

function fixture(statuses: Array<'error' | 'error-reached-max-retries' | 'success'> = []) {
  const jobStatus = Object.fromEntries(
    statuses.map((status, index) => [`job-${index + 1}`, { status }]),
  )
  return {
    jobs: {
      run: vi.fn(async () => ({
        jobStatus,
        noJobsRemaining: true,
        remainingJobsFromQueried: 0,
      })),
    },
    logger: { error: vi.fn(), info: vi.fn() },
  }
}

describe('appointment email fallback cron', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'cron-secret-at-least-24-characters')
    mocks.getPayload.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('rejects an unauthenticated request with private indexation headers', async () => {
    const response = await GET(new Request('http://localhost/api/cron/email-deliveries'))

    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('runs only the bounded email queue sequentially', async () => {
    const payload = fixture(['success', 'success'])
    mocks.getPayload.mockResolvedValue(payload)

    const response = await GET(
      new Request('http://localhost/api/cron/email-deliveries', {
        headers: { authorization: 'Bearer cron-secret-at-least-24-characters' },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      failed: 0,
      processed: 2,
      remaining: 0,
      status: 'ok',
    })
    expect(payload.jobs.run).toHaveBeenCalledWith({
      limit: emailCronBatchSize,
      overrideAccess: true,
      queue: 'appointment-email',
      sequential: true,
      silent: true,
    })
  })

  it('surfaces exhausted jobs without logging provider or customer data', async () => {
    const payload = fixture(['error-reached-max-retries'])
    mocks.getPayload.mockResolvedValue(payload)

    const response = await GET(
      new Request('http://localhost/api/cron/email-deliveries', {
        headers: { authorization: 'Bearer cron-secret-at-least-24-characters' },
      }),
    )

    expect(response.status).toBe(500)
    expect(payload.logger.error).toHaveBeenCalledWith({
      failed: 1,
      job: 'sendAppointmentEmail',
      msg: 'ALERT: Appointment email fallback worker completed with failures.',
      processed: 1,
      remaining: 0,
    })
  })
})
