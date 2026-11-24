import { describe, expect, it, vi } from 'vitest'

import { cleanupUnpaidCustomer } from '@/lib/privacy/cleanupUnpaidCancellations'
import type { Payload } from 'payload'

vi.mock('payload', async (importOriginal) => {
  const original = await importOriginal<typeof import('payload')>()
  return { ...original, createLocalReq: vi.fn(async () => ({})) }
})

const now = new Date('2030-06-01T12:00:00Z')
const customer = { id: 'customer-1', email: 'a@example.com', name: 'Test', orderStatus: 'none' }
const appointment = {
  id: 'appointment-1', customer: customer.id, email: customer.email, status: 'cancelled',
  paymentStatus: 'unpaid', cancelledAt: '2030-04-01T00:00:00Z', updatedAt: '2030-04-01T00:00:00Z',
}
function fixture(bookings: object[] = [appointment]) {
  const db = { beginTransaction: vi.fn(async () => 'tx'), commitTransaction: vi.fn(), rollbackTransaction: vi.fn() }
  const findByID = vi.fn(async ({ collection }: { collection: string }) => collection === 'customers' ? customer : appointment)
  const find = vi.fn(async () => ({ docs: bookings, totalDocs: bookings.length }))
  const update = vi.fn(async () => customer)
  const remove = vi.fn(async (_args: unknown) => ({}))
  return { db, findByID, find, update, delete: remove }
}
describe('unpaid retention cleanup', () => {
  it('removes eligible related bookings, deliveries, audits and the profile in one transaction', async () => {
    const payload = fixture()
    expect(await cleanupUnpaidCustomer({ payload: payload as unknown as Payload, appointmentId: appointment.id, now })).toBe('removed')
    expect(payload.delete.mock.calls.map(([args]) => (args as { collection: string }).collection))
      .toEqual(['email-deliveries', 'appointment-audits', 'appointments', 'customers'])
    expect(payload.db.commitTransaction).toHaveBeenCalledWith('tx')
    expect(payload.db.rollbackTransaction).not.toHaveBeenCalled()
  })
  it('rolls back without deleting when any other booking has payment history', async () => {
    const payload = fixture([appointment, { ...appointment, id: 'appointment-2', stripeCheckoutSessionId: 'cs_test' }])
    expect(await cleanupUnpaidCustomer({ payload: payload as unknown as Payload, appointmentId: appointment.id, now })).toBe('skipped')
    expect(payload.delete).not.toHaveBeenCalled()
    expect(payload.db.rollbackTransaction).toHaveBeenCalledWith('tx')
  })
  it('rolls back a failed write', async () => {
    const payload = fixture()
    payload.delete.mockRejectedValueOnce(new Error('write failed'))
    await expect(cleanupUnpaidCustomer({ payload: payload as unknown as Payload, appointmentId: appointment.id, now })).rejects.toThrow('write failed')
    expect(payload.db.rollbackTransaction).toHaveBeenCalledWith('tx')
    expect(payload.db.commitTransaction).not.toHaveBeenCalled()
  })
})
