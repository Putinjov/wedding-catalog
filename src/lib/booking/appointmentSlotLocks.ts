import { APIError, type PayloadRequest, type RequestContext } from 'payload'

import { isAppointmentBlockingSlot } from '@/lib/booking/appointmentConflicts'
import { getDateKey } from '@/lib/booking/date'
import type { Appointment } from '@/payload-types'

const dateMutexLifetimeMs = 5 * 60 * 1000
const dateMutexContextKey = 'appointmentDateMutexID'

type AppointmentLockContext = RequestContext & {
  [dateMutexContextKey]?: string
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Error && /duplicate|unique|E11000/i.test(error.message)
}

export function getAppointmentSlotKey(startAt: string, endAt: string): string {
  return `${new Date(startAt).toISOString()}|${new Date(endAt).toISOString()}`
}

export function getAppointmentDateMutexKey(startAt: string): string {
  const start = new Date(startAt)
  if (Number.isNaN(start.getTime())) {
    throw new APIError('A valid appointment start is required.', 400)
  }
  return `booking-date:${getDateKey(start)}`
}

export function getAppointmentSlotLockId(
  value: Appointment['slotLock'] | null | undefined,
): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value.id

  return null
}

async function findExistingSlotLock(req: PayloadRequest, slotKey: string) {
  const result = await req.payload.find({
    collection: 'appointment-slot-locks',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { slotKey: { equals: slotKey } },
  })

  return result.docs[0] ?? null
}

async function isStaleSlotLock(req: PayloadRequest, lockId: string): Promise<boolean> {
  const result = await req.payload.find({
    collection: 'appointments',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { slotLock: { equals: lockId } },
  })
  const appointment = result.docs[0]

  return !appointment || !isAppointmentBlockingSlot(appointment)
}

export async function acquireAppointmentSlotLock({
  endAt,
  expiresAt,
  req,
  startAt,
}: {
  endAt: string
  expiresAt?: string | null
  req: PayloadRequest
  startAt: string
}): Promise<string> {
  const slotKey = getAppointmentSlotKey(startAt, endAt)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const lock = await req.payload.create({
        collection: 'appointment-slot-locks',
        data: {
          endAt,
          expiresAt: expiresAt ?? undefined,
          slotKey,
          startAt,
        },
        overrideAccess: true,
        req,
      })

      return String(lock.id)
    } catch (error) {
      if (!isUniqueConflict(error)) throw error

      const existing = await findExistingSlotLock(req, slotKey)
      if (!existing || !(await isStaleSlotLock(req, existing.id))) {
        throw new APIError('This appointment slot is already reserved.', 409)
      }

      await req.payload.delete({
        collection: 'appointment-slot-locks',
        id: existing.id,
        overrideAccess: true,
        req,
      })
    }
  }

  throw new APIError('This appointment slot is already reserved.', 409)
}

function isExpiredDateMutex(expiresAt: null | string | undefined): boolean {
  if (!expiresAt) return false
  const expiry = new Date(expiresAt).getTime()
  return !Number.isNaN(expiry) && expiry <= Date.now()
}

export async function acquireAppointmentDateMutex({
  endAt,
  req,
  startAt,
}: {
  endAt: string
  req: PayloadRequest
  startAt: string
}): Promise<string> {
  const slotKey = getAppointmentDateMutexKey(startAt)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const expiresAt = new Date(Date.now() + dateMutexLifetimeMs).toISOString()
    try {
      const lock = await req.payload.create({
        collection: 'appointment-slot-locks',
        data: { endAt, expiresAt, slotKey, startAt },
        overrideAccess: true,
        req,
      })
      const lockID = String(lock.id)
      const context = (req.context ??= {}) as AppointmentLockContext
      context[dateMutexContextKey] = lockID
      return lockID
    } catch (error) {
      if (!isUniqueConflict(error)) throw error

      const existing = await findExistingSlotLock(req, slotKey)
      if (!existing || !isExpiredDateMutex(existing.expiresAt)) {
        throw new APIError(
          'Another booking request is being processed for this date. Please try again.',
          409,
        )
      }
      await req.payload.delete({
        collection: 'appointment-slot-locks',
        id: existing.id,
        overrideAccess: true,
        req,
      })
    }
  }

  throw new APIError(
    'Another booking request is being processed for this date. Please try again.',
    409,
  )
}

export async function releaseAppointmentDateMutex(req: PayloadRequest): Promise<void> {
  const context = (req.context ??= {}) as AppointmentLockContext
  const lockID = context[dateMutexContextKey]
  if (!lockID) return

  delete context[dateMutexContextKey]
  await releaseAppointmentSlotLock(req, lockID)
}

export async function releaseAppointmentSlotLock(
  req: PayloadRequest,
  lockId: string,
): Promise<void> {
  try {
    await req.payload.delete({
      collection: 'appointment-slot-locks',
      id: lockId,
      overrideAccess: true,
      req,
    })
  } catch (error) {
    if (!(error instanceof Error) || !/not found/i.test(error.message)) throw error
  }
}
