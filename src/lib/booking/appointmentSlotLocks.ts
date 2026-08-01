import { APIError, type Payload, type PayloadRequest } from 'payload'

import { isAppointmentBlockingSlot } from '@/lib/booking/appointmentConflicts'
import type { Appointment } from '@/payload-types'

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Error && /duplicate|unique|E11000/i.test(error.message)
}

export function getAppointmentSlotKey(startAt: string, endAt: string): string {
  return `${new Date(startAt).toISOString()}|${new Date(endAt).toISOString()}`
}

export function getAppointmentSlotLockId(
  value: Appointment['slotLock'] | null | undefined,
): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value.id

  return null
}

async function findExistingSlotLock(payload: Payload, slotKey: string) {
  const result = await payload.find({
    collection: 'appointment-slot-locks',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slotKey: { equals: slotKey } },
  })

  return result.docs[0] ?? null
}

async function isStaleSlotLock(payload: Payload, lockId: string): Promise<boolean> {
  const result = await payload.find({
    collection: 'appointments',
    depth: 0,
    limit: 1,
    overrideAccess: true,
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

      const existing = await findExistingSlotLock(req.payload, slotKey)
      if (!existing || !(await isStaleSlotLock(req.payload, existing.id))) {
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
