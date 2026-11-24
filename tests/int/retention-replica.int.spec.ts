import { randomUUID } from 'node:crypto'
import { Types, type ClientSession } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createLocalReq, getPayload, type Payload } from 'payload'

import { validateAppointmentCustomer } from '@/lib/customers/appointmentCustomer'
import { cleanupUnpaidCustomer } from '@/lib/privacy/cleanupUnpaidCancellations'

const integration = process.env.RETENTION_REPLICA_TEST === '1' ? describe : describe.skip

integration('retention with MongoDB replica-set transactions', () => {
  let payload: Payload
  const ids: Types.ObjectId[] = []

  beforeAll(async () => {
    const { default: config } = await import('@payload-config')
    payload = await getPayload({ config })
    await payload.db.collections.customers.init()
  }, 60_000)

  afterAll(async () => {
    if (!payload) return
    await payload.db.collections.appointments.collection.deleteMany({ _id: { $in: ids } })
    await payload.db.collections.customers.collection.deleteMany({ _id: { $in: ids } })
    await payload.destroy()
  })

  it('atomically deletes an eligible unpaid booking and its inactive profile', async () => {
    const profileID = new Types.ObjectId()
    const appointmentID = new Types.ObjectId()
    ids.push(profileID, appointmentID)
    const email = `retention-${randomUUID()}@example.test`
    const now = new Date()
    const oldDate = new Date(now.getTime() - 60 * 86_400_000)
    await payload.db.collections.customers.collection.insertOne({
      _id: profileID, email, name: 'Synthetic customer', phone: '123456',
      orderStatus: 'none', createdAt: oldDate, updatedAt: oldDate,
    })
    await payload.db.collections.appointments.collection.insertOne({
      _id: appointmentID, customer: profileID, customerName: 'Synthetic customer', email, phone: '123456',
      status: 'cancelled', paymentStatus: 'unpaid', cancelledAt: oldDate,
      publicReference: `fit_${randomUUID().replaceAll('-', '')}`, purpose: 'buy', fittingFee: 0,
      currency: 'EUR', source: 'admin', startAt: oldDate, endAt: oldDate,
      createdAt: oldDate, updatedAt: oldDate,
    })
    expect(await cleanupUnpaidCustomer({ payload, appointmentId: String(appointmentID), now })).toBe('removed')
    expect(await payload.db.collections.customers.collection.countDocuments({ _id: profileID })).toBe(0)
    expect(await payload.db.collections.appointments.collection.countDocuments({ _id: appointmentID })).toBe(0)
  }, 60_000)

  it('preserves a customer and previous booking when a new booking commits concurrently', async () => {
    const profileID = new Types.ObjectId()
    const oldID = new Types.ObjectId()
    const newID = new Types.ObjectId()
    ids.push(profileID, oldID, newID)
    const email = `retention-${randomUUID()}@example.test`
    const now = new Date()
    const oldDate = new Date(now.getTime() - 60 * 86_400_000)
    await payload.db.collections.customers.collection.insertOne({
      _id: profileID, email, name: 'Synthetic customer', phone: '123456',
      orderStatus: 'none', createdAt: oldDate, updatedAt: oldDate,
    })
    await payload.db.collections.appointments.collection.insertOne({
      _id: oldID, customer: profileID, customerName: 'Synthetic customer', email, phone: '123456',
      status: 'cancelled', paymentStatus: 'unpaid', cancelledAt: oldDate,
      publicReference: `fit_${randomUUID().replaceAll('-', '')}`, purpose: 'buy', fittingFee: 0,
      currency: 'EUR', source: 'admin', startAt: oldDate, endAt: oldDate,
      createdAt: oldDate, updatedAt: oldDate,
    })

    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('Replica-set transactions are required.')
    const req = await createLocalReq({}, payload)
    req.transactionID = transactionID
    const data = { source: 'admin', purpose: 'buy', customerName: 'Synthetic customer', email, phone: '123456' }
    await validateAppointmentCustomer({ data, operation: 'create', req } as never)

    const adapter = payload.db as unknown as { sessions: Record<string, ClientSession> }
    await payload.db.collections.appointments.collection.insertOne({
      _id: newID, customer: profileID, customerName: 'Synthetic customer', email, phone: '123456',
      status: 'confirmed', paymentStatus: 'unpaid', publicReference: `fit_${randomUUID().replaceAll('-', '')}`,
      purpose: 'buy', fittingFee: 0, currency: 'EUR', source: 'admin', startAt: now, endAt: now,
      createdAt: now, updatedAt: now,
    }, { session: adapter.sessions[String(transactionID)] })

    const cleanup = cleanupUnpaidCustomer({ payload, appointmentId: String(oldID), now })
      .catch(() => 'conflict' as const)
    await payload.db.commitTransaction(transactionID)
    expect(['skipped', 'conflict']).toContain(await cleanup)
    expect(await payload.db.collections.customers.collection.countDocuments({ _id: profileID })).toBe(1)
    expect(await payload.db.collections.appointments.collection.countDocuments({ _id: { $in: [oldID, newID] } })).toBe(2)
  }, 60_000)
})
