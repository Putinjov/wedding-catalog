import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
  queueDayBeforeAppointmentReminders: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return { ...actual, getPayload: mocks.getPayload }
})
vi.mock('@/lib/notifications/queueAppointmentReminders', () => ({
  queueDayBeforeAppointmentReminders: mocks.queueDayBeforeAppointmentReminders,
}))

import { GET } from '@/app/(frontend)/api/cron/appointment-reminders/route'

const url = 'http://localhost/api/cron/appointment-reminders'
const authorization = 'Bearer cron-secret-at-least-24-characters'

describe('appointment reminder cron', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'cron-secret-at-least-24-characters')
    mocks.getPayload.mockReset()
    mocks.queueDayBeforeAppointmentReminders.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('rejects unauthenticated calls without exposing the cron route to indexing or caching', async () => {
    const response = await GET(new Request(url))

    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('reports only counts for a successful bounded queue pass', async () => {
    const payload = { logger: { error: vi.fn(), info: vi.fn() } }
    mocks.getPayload.mockResolvedValue(payload)
    mocks.queueDayBeforeAppointmentReminders.mockResolvedValue({ candidates: 3, overflow: false })

    const response = await GET(new Request(url, { headers: { authorization } }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      candidates: 3,
      overflow: false,
      status: 'ok',
    })
    expect(payload.logger.info).toHaveBeenCalledWith({
      candidates: 3,
      msg: 'Day-before appointment reminders queued.',
    })
  })

  it('alerts if the bounded batch does not cover all appointments', async () => {
    const payload = { logger: { error: vi.fn(), info: vi.fn() } }
    mocks.getPayload.mockResolvedValue(payload)
    mocks.queueDayBeforeAppointmentReminders.mockResolvedValue({ candidates: 8, overflow: true })

    const response = await GET(new Request(url, { headers: { authorization } }))

    expect(response.status).toBe(500)
    expect(payload.logger.error).toHaveBeenCalledWith({
      candidates: 8,
      msg: 'ALERT: Appointment reminder batch limit reached; some reminders may not be queued.',
    })
  })
})
