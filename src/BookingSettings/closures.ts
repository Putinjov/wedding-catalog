import {
  APIError,
  commitTransaction,
  initTransaction,
  killTransaction,
  type Endpoint,
} from 'payload'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { ownerOrManager } from '@/access/roles'

const dateSchema = z.iso.date()
const changeSchema = z
  .object({
    startDate: dateSchema,
    endDate: dateSchema,
    closed: z.boolean(),
  })
  .refine((value) => value.startDate <= value.endDate, 'End date must follow start date.')

type Range = { startDate: string; endDate: string }
function shift(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}

export function changeClosures(ranges: Range[], target: Range, closed: boolean): Range[] {
  if (!closed)
    return ranges.flatMap((range) => {
      if (range.endDate < target.startDate || range.startDate > target.endDate) return [range]
      const remaining: Range[] = []
      if (range.startDate < target.startDate)
        remaining.push({ startDate: range.startDate, endDate: shift(target.startDate, -1) })
      if (range.endDate > target.endDate)
        remaining.push({ startDate: shift(target.endDate, 1), endDate: range.endDate })
      return remaining
    })
  const result: Range[] = []
  for (const range of [...ranges, target].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const previous = result.at(-1)
    if (previous && range.startDate <= shift(previous.endDate, 1)) {
      previous.endDate = previous.endDate > range.endDate ? previous.endDate : range.endDate
    } else result.push({ ...range })
  }
  return result
}

export const changeClosuresEndpoint: Endpoint = {
  path: '/closures',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return Response.json({ message: 'Authentication required.' }, { status: 401 })
    if (!ownerOrManager({ req }))
      return Response.json(
        { message: 'Only owners and managers can change closures.' },
        { status: 403 },
      )
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ message: 'Invalid JSON.' }, { status: 400 })
    }
    const parsed = changeSchema.safeParse(body)
    if (!parsed.success)
      return Response.json({ message: parsed.error.issues[0]?.message }, { status: 400 })
    const { startDate, endDate, closed } = parsed.data
    const ownsTransaction = await initTransaction(req)
    try {
      const settings = await req.payload.findGlobal({
        slug: 'booking-settings',
        req,
        overrideAccess: false,
      })
      const closures = changeClosures(settings.closures ?? [], { startDate, endDate }, closed)
      const holidays = (settings.holidays ?? []).filter(
        (day) => closed || day.date < startDate || day.date > endDate,
      )
      await req.payload.updateGlobal({
        slug: 'booking-settings',
        req,
        overrideAccess: false,
        context: { ...req.context, disableRevalidate: true },
        data: { ...settings, closures, holidays },
      })
      if (ownsTransaction) await commitTransaction(req)
      revalidateTag('global_booking-settings', { expire: 0 })
      return Response.json({ success: true })
    } catch (error) {
      if (ownsTransaction) await killTransaction(req)
      if (error instanceof APIError)
        return Response.json({ message: error.message }, { status: error.status })
      throw error
    }
  },
}
