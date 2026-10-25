import type { Payload, PayloadRequest } from 'payload'

import { getDateKey, parseDateKey } from '@/lib/booking/date'
import { normalizeCustomerEmail } from '@/lib/customers/email'
import type { Customer } from '@/payload-types'

export type RepeatBookingDecision =
  | { kind: 'closed'; customer: Customer }
  | { kind: 'free'; customer: Customer }
  | { kind: 'standard'; customer: Customer | null }

export function getTwoYearAnniversary(dateKey: string): string | null {
  const date = parseDateKey(dateKey)
  if (!date) return null
  const year = date.year + 2
  const lastDay = new Date(Date.UTC(year, date.month, 0)).getUTCDate()
  return `${year.toString().padStart(4, '0')}-${date.month.toString().padStart(2, '0')}-${Math.min(date.day, lastDay).toString().padStart(2, '0')}`
}

export function isWithinRepeatBookingWindow(completedAt: Date, requestedAt: Date): boolean {
  if (
    Number.isNaN(completedAt.getTime()) ||
    Number.isNaN(requestedAt.getTime()) ||
    requestedAt <= completedAt
  ) return false

  const completedDate = getDateKey(completedAt)
  const requestedDate = getDateKey(requestedAt)
  const anniversary = getTwoYearAnniversary(completedDate)
  return anniversary !== null && requestedDate <= anniversary
}

export async function resolveRepeatBookingDecision({
  email,
  now,
  payload,
  req,
  requestedAt,
}: {
  email: string
  now: Date
  payload: Payload
  req?: PayloadRequest
  requestedAt: Date
}): Promise<RepeatBookingDecision> {
  const profiles = await payload.find({
    collection: 'customers',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    ...(req ? { req } : {}),
    where: { email: { equals: normalizeCustomerEmail(email) } },
  })
  const customer = profiles.docs[0] ?? null
  if (!customer) return { customer: null, kind: 'standard' }
  if (customer.purchaseConfirmedAt) return { customer, kind: 'closed' }

  const completed = await payload.find({
    collection: 'appointments',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    ...(req ? { req } : {}),
    sort: '-startAt',
    where: {
      and: [
        { customer: { equals: customer.id } },
        { status: { equals: 'completed' } },
        { endAt: { less_than_equal: now.toISOString() } },
        { startAt: { less_than: requestedAt.toISOString() } },
      ],
    },
  })
  const latest = completed.docs[0]
  return {
    customer,
    kind: latest && isWithinRepeatBookingWindow(new Date(latest.startAt), requestedAt)
      ? 'free'
      : 'standard',
  }
}
