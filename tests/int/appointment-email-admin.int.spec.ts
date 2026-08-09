import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ queueAppointmentEmail: vi.fn() }))

vi.mock('@/lib/notifications/queueAppointmentEmail', () => ({
  queueAppointmentEmail: mocks.queueAppointmentEmail,
}))

import { appointmentCalendarEndpoints } from '@/lib/admin/appointments/endpoints'

const endpoint = appointmentCalendarEndpoints.find(
  (candidate) => candidate.path === '/calendar/:id/email/resend-confirmation',
)

function request(status: 'cancelled' | 'confirmed' = 'confirmed') {
  const payload = {
    findByID: vi.fn(async () => ({
      id: 'appointment-1',
      status,
    })),
  }
  return {
    json: vi.fn(async () => ({ operationKey: '11111111-1111-4111-8111-111111111111' })),
    payload,
    routeParams: { id: 'appointment-1' },
    user: {
      collection: 'users',
      id: 'staff-1',
      role: 'staff',
    },
  }
}

describe('appointment confirmation resend endpoint', () => {
  beforeEach(() => {
    mocks.queueAppointmentEmail.mockReset()
    mocks.queueAppointmentEmail.mockResolvedValue({
      event: 'confirmed',
      id: 'delivery-1',
      status: 'queued',
    })
  })

  it('queues an explicit idempotent resend for a confirmed appointment', async () => {
    const req = request()
    const response = await endpoint?.handler(req as never)

    expect(response?.status).toBe(200)
    await expect(response?.json()).resolves.toEqual({
      delivery: { event: 'confirmed', id: 'delivery-1', status: 'queued' },
    })
    expect(mocks.queueAppointmentEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'confirmed',
        idempotencyKey:
          'appointment-email:appointment-1:confirmed:manual:11111111-1111-4111-8111-111111111111',
        requestedBy: req.user,
        trigger: 'manual',
      }),
    )
  })

  it('rejects a resend when the backend state is not confirmed', async () => {
    const response = await endpoint?.handler(request('cancelled') as never)

    expect(response?.status).toBe(409)
    await expect(response?.json()).resolves.toEqual({
      message: 'Only a confirmed appointment email can be resent.',
    })
    expect(mocks.queueAppointmentEmail).not.toHaveBeenCalled()
  })
})
