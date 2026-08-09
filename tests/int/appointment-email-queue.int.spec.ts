import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Appointment, EmailDelivery } from '@/payload-types'

const mocks = vi.hoisted(() => ({ after: vi.fn() }))

vi.mock('next/server', () => ({ after: mocks.after }))

import { queueAppointmentEmail } from '@/lib/notifications/queueAppointmentEmail'

const appointment = {
  id: 'appointment-1',
  customerName: 'Synthetic Customer',
  email: 'customer@example.com',
  phone: '+353000000000',
  notes: 'private note',
  updatedAt: '2030-06-01T09:00:00.000Z',
} as Appointment

const delivery = {
  appointment: appointment.id,
  attempts: 0,
  createdAt: '2030-06-01T09:00:00.000Z',
  event: 'confirmed',
  id: 'delivery-1',
  idempotencyKey: 'appointment-email:appointment-1:confirmed:event-1',
  status: 'queued',
  trigger: 'automatic',
  updatedAt: '2030-06-01T09:00:00.000Z',
} satisfies EmailDelivery

function fixture(existing: EmailDelivery | null = null) {
  const payload = {
    create: vi.fn(async () => delivery),
    find: vi.fn(async () => ({ docs: existing ? [existing] : [] })),
    jobs: {
      queue: vi.fn(async () => ({ id: 'job-1' })),
      runByID: vi.fn(async () => ({ jobStatus: { 'job-1': { status: 'success' } } })),
    },
    logger: { error: vi.fn(), info: vi.fn() },
    update: vi.fn(async () => ({ ...delivery, jobId: 'job-1' })),
  }
  return { payload, req: { payload } }
}

describe('appointment email queue idempotency', () => {
  beforeEach(() => mocks.after.mockReset())

  it('stores only a delivery ID in the Payload job and schedules an after-response run', async () => {
    let callback: (() => Promise<void>) | undefined
    mocks.after.mockImplementation((value: () => Promise<void>) => {
      callback = value
    })
    const { payload, req } = fixture()

    await queueAppointmentEmail({
      appointment,
      event: 'confirmed',
      idempotencyKey: delivery.idempotencyKey,
      req: req as never,
      trigger: 'automatic',
    })

    expect(payload.jobs.queue).toHaveBeenCalledWith({
      input: { deliveryId: delivery.id },
      overrideAccess: true,
      queue: 'appointment-email',
      req,
      task: 'sendAppointmentEmail',
    })
    const queuedData = JSON.stringify(payload.jobs.queue.mock.calls)
    expect(queuedData).not.toContain(appointment.email)
    expect(queuedData).not.toContain(appointment.phone)
    expect(queuedData).not.toContain(appointment.notes)

    await callback?.()
    expect(payload.jobs.runByID).toHaveBeenCalledWith({
      id: 'job-1',
      overrideAccess: true,
      silent: true,
    })
  })

  it('returns the existing delivery without queueing a duplicate job', async () => {
    const { payload, req } = fixture(delivery)

    const result = await queueAppointmentEmail({
      appointment,
      event: 'confirmed',
      idempotencyKey: delivery.idempotencyKey,
      req: req as never,
      trigger: 'automatic',
    })

    expect(result).toBe(delivery)
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.jobs.queue).not.toHaveBeenCalled()
    expect(mocks.after).not.toHaveBeenCalled()
  })
})
