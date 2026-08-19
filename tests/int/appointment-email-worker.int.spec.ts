import { afterEach, describe, expect, it, vi } from 'vitest'

import { sendAppointmentEmail } from '@/lib/notifications/sendAppointmentEmail'
import type { Appointment, EmailDelivery } from '@/payload-types'

const appointment = {
  amountPaid: 2000,
  createdAt: '2030-06-01T09:00:00.000Z',
  currency: 'EUR',
  customerName: 'Synthetic Customer',
  email: 'customer@example.com',
  endAt: '2030-06-10T11:00:00.000Z',
  fittingFee: 20,
  id: 'appointment-1',
  needsAdminReview: false,
  notes: 'private customer note',
  paymentStatus: 'paid',
  phone: '+353000000000',
  publicReference: 'fit_synthetic_reference',
  purpose: 'buy',
  source: 'website',
  startAt: '2030-06-10T10:00:00.000Z',
  status: 'confirmed',
  updatedAt: '2030-06-01T09:00:00.000Z',
} as Appointment

function delivery(overrides: Partial<EmailDelivery> = {}): EmailDelivery {
  return {
    appointment: appointment.id,
    attempts: 0,
    createdAt: '2030-06-01T09:00:00.000Z',
    event: 'confirmed',
    id: 'delivery-1',
    idempotencyKey: 'appointment-email:appointment-1:confirmed:event-1',
    status: 'queued',
    trigger: 'automatic',
    updatedAt: '2030-06-01T09:00:00.000Z',
    ...overrides,
  }
}

function fixture(currentDelivery = delivery(), currentAppointment = appointment) {
  const payload = {
    findByID: vi.fn(async ({ collection }: { collection: string }) =>
      collection === 'email-deliveries' ? currentDelivery : currentAppointment,
    ),
    sendEmail: vi.fn(async () => undefined),
    update: vi.fn(async ({ data }: { data: Partial<EmailDelivery> }) => ({
      ...currentDelivery,
      ...data,
    })),
  }
  return { payload, req: { payload } }
}

describe('appointment email worker', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries transient SMTP failures briefly and records a successful send', async () => {
    vi.useFakeTimers()
    const { payload, req } = fixture()
    payload.sendEmail
      .mockRejectedValueOnce(Object.assign(new Error('provider detail'), { code: 'ETIMEDOUT' }))
      .mockRejectedValueOnce(Object.assign(new Error('provider detail'), { responseCode: 451 }))
      .mockResolvedValueOnce(undefined)

    const resultPromise = sendAppointmentEmail({ deliveryId: 'delivery-1', req: req as never })
    await vi.advanceTimersByTimeAsync(7_000)

    await expect(resultPromise).resolves.toBe('sent')
    expect(payload.sendEmail).toHaveBeenCalledTimes(3)
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'sent' }),
      }),
    )
  })

  it('sends branded HTML with a plain-text fallback for customer emails', async () => {
    const { payload, req } = fixture()

    await expect(
      sendAppointmentEmail({ deliveryId: 'delivery-1', req: req as never }),
    ).resolves.toBe('sent')

    expect(payload.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Your fitting is confirmed'),
        subject: 'Your private fitting is confirmed',
        text: expect.stringContaining('Your fitting fee and appointment have been confirmed.'),
        to: appointment.email,
      }),
    )
    const sentMessage = JSON.stringify(payload.sendEmail.mock.calls[0])
    expect(sentMessage).toContain('#fbf6ee')
    expect(sentMessage).toContain('#8e6fa0')
    expect(sentMessage).toContain('CAIT')
    expect(sentMessage).not.toContain('Tullamore')
    expect(sentMessage).not.toContain(appointment.phone)
    expect(sentMessage).not.toContain(appointment.notes)
  })

  it('stores only a sanitized category for a permanent provider failure', async () => {
    const { payload, req } = fixture()
    payload.sendEmail.mockRejectedValue(
      new Error('550 customer@example.com rejected with sensitive provider response'),
    )

    await expect(
      sendAppointmentEmail({ deliveryId: 'delivery-1', req: req as never }),
    ).rejects.toThrow('Permanent SMTP delivery failure.')
    expect(payload.sendEmail).toHaveBeenCalledTimes(1)
    const storedUpdates = JSON.stringify(payload.update.mock.calls)
    expect(storedUpdates).toContain('Permanent SMTP delivery failure.')
    expect(storedUpdates).not.toContain('customer@example.com')
    expect(storedUpdates).not.toContain('sensitive provider response')
  })

  it('skips all legacy pending emails, even while the appointment is still pending', async () => {
    const pendingAppointment = {
      ...appointment,
      amountPaid: null,
      paymentStatus: 'unpaid' as const,
      status: 'pending_payment' as const,
    }
    const { payload, req } = fixture(delivery({ event: 'pending' }), pendingAppointment)

    await expect(
      sendAppointmentEmail({ deliveryId: 'delivery-1', req: req as never }),
    ).resolves.toBe('skipped')
    expect(payload.sendEmail).not.toHaveBeenCalled()
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'skipped' }) }),
    )
  })

  it('omits customer contact details, notes, and private references from admin alerts', async () => {
    const conflict = {
      ...appointment,
      needsAdminReview: true,
      status: 'payment_received_conflict' as const,
    }
    const { payload, req } = fixture(delivery({ event: 'admin_alert' }), conflict)

    await expect(
      sendAppointmentEmail({ deliveryId: 'delivery-1', req: req as never }),
    ).resolves.toBe('sent')

    const message = JSON.stringify(payload.sendEmail.mock.calls)
    expect(message).toContain('bookings@caitbridal.ie')
    expect(message).not.toContain(appointment.email)
    expect(message).not.toContain(appointment.phone)
    expect(message).not.toContain(appointment.notes)
    expect(message).not.toContain(appointment.customerName)
    expect(message).not.toContain(appointment.publicReference)
    expect(message).not.toContain('<html')
  })
})
