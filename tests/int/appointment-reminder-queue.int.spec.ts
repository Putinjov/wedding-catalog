import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createLocalReq: vi.fn(), queueAppointmentEmail: vi.fn() }))

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return { ...actual, createLocalReq: mocks.createLocalReq }
})
vi.mock('@/lib/notifications/queueAppointmentEmail', () => ({
  queueAppointmentEmail: mocks.queueAppointmentEmail,
}))

import {
  appointmentReminderBatchSize,
  queueDayBeforeAppointmentReminders,
} from '@/lib/notifications/queueAppointmentReminders'

function fixture() {
  const appointments = [
    { id: 'appointment-1', startAt: '2026-10-25T10:00:00.000Z', status: 'confirmed' },
  ]
  const payload = {
    find: vi.fn(async () => ({ docs: appointments, hasNextPage: false })),
  }
  const req = { payload }
  mocks.createLocalReq.mockResolvedValue(req)
  return { appointments, payload, req }
}

describe('day-before reminder queue discovery', () => {
  beforeEach(() => {
    mocks.createLocalReq.mockReset()
    mocks.queueAppointmentEmail.mockReset()
  })

  it('queries only confirmed appointments in the Dublin next-day window', async () => {
    const { appointments, payload, req } = fixture()

    await expect(
      queueDayBeforeAppointmentReminders(payload as never, new Date('2026-10-24T10:00:00Z')),
    ).resolves.toEqual({ candidates: 1, overflow: false })

    expect(payload.find).toHaveBeenCalledWith({
      collection: 'appointments',
      depth: 0,
      limit: appointmentReminderBatchSize,
      overrideAccess: true,
      req,
      select: { id: true, startAt: true, status: true },
      sort: 'startAt',
      where: {
        and: [
          { status: { equals: 'confirmed' } },
          { startAt: { greater_than_equal: '2026-10-24T23:00:00.000Z' } },
          { startAt: { less_than: '2026-10-26T00:00:00.000Z' } },
        ],
      },
    })
    expect(mocks.queueAppointmentEmail).toHaveBeenCalledWith({
      appointment: appointments[0],
      event: 'reminder',
      idempotencyKey: 'appointment-email:appointment-1:reminder:2026-10-25T10:00:00.000Z',
      req,
      trigger: 'automatic',
    })
  })

  it('does not queue a stale result if appointment status has changed', async () => {
    const { appointments, payload } = fixture()
    appointments[0].status = 'cancelled'

    await queueDayBeforeAppointmentReminders(payload as never, new Date('2026-10-24T10:00:00Z'))

    expect(mocks.queueAppointmentEmail).not.toHaveBeenCalled()
  })
})
