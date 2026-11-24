import { APIError, commitTransaction, initTransaction, killTransaction, type Endpoint } from 'payload'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { ownerOrManager } from '@/access/roles'
import type { BookingBlockedInterval } from '@/config/booking'

const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
const schema = z.object({ date: z.iso.date(), start: time, end: time, closed: z.boolean() })
  .refine((value) => value.start < value.end, 'End time must follow start time.')

export function changeBlockedIntervals(
  intervals: BookingBlockedInterval[], target: BookingBlockedInterval, closed: boolean,
): BookingBlockedInterval[] {
  const other = intervals.filter((item) => item.date !== target.date)
  const same = intervals.filter((item) => item.date === target.date)
  if (!closed) {
    return [...other, ...same.flatMap((item) => {
      if (item.end <= target.start || item.start >= target.end) return [item]
      const remaining: BookingBlockedInterval[] = []
      if (item.start < target.start) remaining.push({ date: item.date, start: item.start, end: target.start })
      if (item.end > target.end) remaining.push({ date: item.date, start: target.end, end: item.end })
      return remaining
    })]
  }
  const merged: BookingBlockedInterval[] = []
  for (const item of [...same, target].sort((a, b) => a.start.localeCompare(b.start))) {
    const previous = merged.at(-1)
    if (previous && item.start <= previous.end) {
      if (item.end > previous.end) previous.end = item.end
    } else merged.push({ date: item.date, start: item.start, end: item.end })
  }
  return [...other, ...merged]
}

export const changeBlockedIntervalsEndpoint: Endpoint = {
  path: '/blocked-intervals',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return Response.json({ message: 'Authentication required.' }, { status: 401 })
    if (!ownerOrManager({ req })) return Response.json({ message: 'Only owners and managers can change availability.' }, { status: 403 })
    let body: unknown
    try { body = await req.json?.() } catch {
      return Response.json({ message: 'Invalid JSON.' }, { status: 400 })
    }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return Response.json({ message: parsed.error.issues[0]?.message }, { status: 400 })
    const { closed, ...target } = parsed.data
    const ownsTransaction = await initTransaction(req)
    try {
      const settings = await req.payload.findGlobal({ slug: 'booking-settings', req, overrideAccess: false })
      const blockedIntervals = changeBlockedIntervals(settings.blockedIntervals ?? [], target, closed)
      await req.payload.updateGlobal({
        slug: 'booking-settings', req, overrideAccess: false,
        context: { ...req.context, disableRevalidate: true },
        data: { ...settings, blockedIntervals },
      })
      if (ownsTransaction) await commitTransaction(req)
      revalidateTag('global_booking-settings', { expire: 0 })
      return Response.json({ success: true })
    } catch (error) {
      if (ownsTransaction) await killTransaction(req)
      if (error instanceof APIError) return Response.json({ message: error.message }, { status: error.status })
      throw error
    }
  },
}
