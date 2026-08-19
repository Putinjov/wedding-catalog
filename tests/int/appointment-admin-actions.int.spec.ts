import type { PayloadRequest, TypedUser } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { defaultBookingSettings } from '@/config/booking'
import {
  rescheduleAppointment,
  updateAppointmentNotes,
} from '@/lib/admin/appointments/appointmentActions'
import { getAppointmentHistory } from '@/lib/admin/appointments/appointmentHistory'
import type { Appointment } from '@/payload-types'

vi.mock('@/lib/booking/settings', () => ({
  getBookingSettingsFromPayload: vi.fn(async () => defaultBookingSettings),
}))

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appointment-1',
    createdAt: '2026-08-01T09:00:00.000Z',
    currency: 'EUR',
    customerName: 'Customer',
    email: 'customer@example.test',
    endAt: '2026-10-20T10:00:00.000Z',
    fittingFee: 20,
    needsAdminReview: false,
    paymentStatus: 'paid',
    phone: '+353100000000',
    publicReference: `fit_${'a'.repeat(32)}`,
    purpose: 'undecided',
    source: 'website',
    startAt: '2026-10-20T09:00:00.000Z',
    status: 'confirmed',
    updatedAt: '2026-08-01T09:00:00.000Z',
    ...overrides,
  }
}

function user(role: 'manager' | 'owner' | 'staff'): TypedUser {
  return { collection: 'users', id: `${role}-1`, role }
}

function actionRequest({ existingAudit = false, current = appointment() } = {}) {
  let stored = current
  const payload = {
    find: vi.fn(async () => ({
      docs: existingAudit ? [{ id: 'audit-1' }] : [],
      totalDocs: existingAudit ? 1 : 0,
    })),
    findByID: vi.fn(async () => stored),
    update: vi.fn(async ({ data }: { data: Partial<Appointment> }) => {
      stored = { ...stored, ...data }
      return stored
    }),
  }

  return { payload, req: { payload } as unknown as PayloadRequest }
}

describe('appointment admin actions', () => {
  it('reschedules a confirmed appointment with a Dublin-safe time and an idempotency audit', async () => {
    const { payload, req } = actionRequest()

    await rescheduleAppointment({
      id: 'appointment-1',
      input: {
        date: '2026-10-27',
        operationKey: '11111111-1111-4111-8111-111111111111',
        time: '10:00',
      },
      req,
      user: user('staff'),
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          endAt: '2026-10-27T11:00:00.000Z',
          startAt: '2026-10-27T10:00:00.000Z',
        },
        context: expect.objectContaining({
          appointmentAudit: expect.objectContaining({
            action: 'appointment.rescheduled',
            idempotencyKey:
              'appointment-admin:reschedule:appointment-1:11111111-1111-4111-8111-111111111111',
          }),
        }),
        req,
        user: expect.objectContaining({ role: 'staff' }),
      }),
    )
  })

  it('blocks rescheduling outside the confirmed state', async () => {
    const { payload, req } = actionRequest({
      current: appointment({ paymentStatus: 'unpaid', status: 'cancelled' }),
    })

    await expect(
      rescheduleAppointment({
        id: 'appointment-1',
        input: {
          date: '2026-10-27',
          operationKey: '22222222-2222-4222-8222-222222222222',
          time: '10:00',
        },
        req,
        user: user('manager'),
      }),
    ).rejects.toMatchObject({ status: 409 })
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('does not repeat an already audited reschedule operation', async () => {
    const { payload, req } = actionRequest({ existingAudit: true })

    await rescheduleAppointment({
      id: 'appointment-1',
      input: {
        date: '2026-10-27',
        operationKey: '33333333-3333-4333-8333-333333333333',
        time: '10:00',
      },
      req,
      user: user('owner'),
    })

    expect(payload.update).not.toHaveBeenCalled()
  })

  it('audits an internal note change without copying note content into metadata', async () => {
    const { payload, req } = actionRequest({
      current: appointment({ internalNotes: 'Previous private note' }),
    })

    await updateAppointmentNotes({
      id: 'appointment-1',
      input: {
        internalNotes: 'Call customer about alterations',
        operationKey: '44444444-4444-4444-8444-444444444444',
      },
      req,
      user: user('staff'),
    })

    const update = payload.update.mock.calls[0]?.[0]
    expect(update.data).toEqual({ internalNotes: 'Call customer about alterations' })
    expect(update.context.appointmentAudit).toMatchObject({
      action: 'appointment.internal_notes_updated',
      metadata: { hadInternalNotes: true, hasInternalNotes: true },
    })
    expect(JSON.stringify(update.context.appointmentAudit)).not.toContain('Call customer')
    expect(JSON.stringify(update.context.appointmentAudit)).not.toContain('Previous private note')
  })
})

describe('appointment admin history', () => {
  it('returns only whitelisted audit metadata and safe email delivery fields to an owner', async () => {
    const payload = {
      find: vi.fn(async ({ collection }: { collection: string }) =>
        collection === 'appointment-audits'
          ? {
              docs: [
                {
                  action: 'appointment.payment_changed',
                  actor: { id: 'owner-1', name: 'Owner' },
                  actorType: 'user',
                  appointment: 'appointment-1',
                  id: 'audit-1',
                  metadata: {
                    customerEmail: 'customer@example.test',
                    paymentStatus: 'paid',
                    previousPaymentStatus: 'processing',
                    providerResponse: 'secret-provider-data',
                    refundAmount: 2000,
                  },
                  newStatus: 'confirmed',
                  previousStatus: 'payment_processing',
                  timestamp: '2026-08-01T10:00:00.000Z',
                },
              ],
            }
          : {
              docs: [
                {
                  appointment: 'appointment-1',
                  attempts: 1,
                  createdAt: '2026-08-01T10:00:00.000Z',
                  event: 'confirmed',
                  id: 'delivery-1',
                  idempotencyKey: 'hidden-key',
                  status: 'sent',
                  trigger: 'manual',
                  updatedAt: '2026-08-01T10:00:00.000Z',
                },
              ],
            },
      ),
    }
    const req = { payload } as unknown as PayloadRequest

    const history = await getAppointmentHistory({
      appointmentId: 'appointment-1',
      req,
      user: user('owner'),
    })

    expect(history.audits[0]).toMatchObject({
      actorLabel: 'Owner',
      paymentStatus: 'paid',
      previousPaymentStatus: 'processing',
      refundAmount: 2000,
    })
    expect(history.emails[0]).toMatchObject({ event: 'confirmed', status: 'sent' })
    expect(JSON.stringify(history)).not.toContain('customer@example.test')
    expect(JSON.stringify(history)).not.toContain('secret-provider-data')
    expect(JSON.stringify(history)).not.toContain('hidden-key')
  })

  it('does not query restricted history collections for staff', async () => {
    const payload = { find: vi.fn() }

    const history = await getAppointmentHistory({
      appointmentId: 'appointment-1',
      req: { payload } as unknown as PayloadRequest,
      user: user('staff'),
    })

    expect(history).toEqual({ audits: [], emails: [] })
    expect(payload.find).not.toHaveBeenCalled()
  })
})
