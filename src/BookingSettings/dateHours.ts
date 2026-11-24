import { APIError, commitTransaction, initTransaction, killTransaction, type Endpoint } from 'payload'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { ownerOrManager } from '@/access/roles'
import { getDateKey } from '@/lib/booking/date'
import { changeClosures } from './closures'

const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
const schema = z.discriminatedUnion('mode', [
  z.object({ date: z.iso.date(), mode: z.literal('custom'), start: time, end: time }),
  z.object({ date: z.iso.date(), mode: z.literal('default') }),
])

export const changeDateHoursEndpoint: Endpoint = {
  path: '/date-hours',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return Response.json({ message: 'Authentication required.' }, { status: 401 })
    if (!ownerOrManager({ req })) return Response.json({ message: 'Only owners and managers can change opening hours.' }, { status: 403 })
    let body: unknown
    try { body = await req.json?.() } catch {
      return Response.json({ message: 'Invalid JSON.' }, { status: 400 })
    }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return Response.json({ message: 'Invalid date or opening hours.' }, { status: 400 })
    const input = parsed.data
    if (input.date < getDateKey()) return Response.json({ message: 'Past dates cannot be changed.' }, { status: 400 })
    if (input.mode === 'custom' && input.start >= input.end) return Response.json({ message: 'Closing time must follow opening time.' }, { status: 400 })
    const ownsTransaction = await initTransaction(req)
    try {
      const settings = await req.payload.findGlobal({ slug: 'booking-settings', req, overrideAccess: false })
      const dateHours = (settings.dateHours ?? []).filter(item => item.date !== input.date)
      if (input.mode === 'custom') dateHours.push({ date: input.date, start: input.start, end: input.end })
      const closures = input.mode === 'custom'
        ? changeClosures(settings.closures ?? [], { startDate: input.date, endDate: input.date }, false)
        : settings.closures
      const holidays = input.mode === 'custom'
        ? (settings.holidays ?? []).filter(day => day.date !== input.date)
        : settings.holidays
      await req.payload.updateGlobal({
        slug: 'booking-settings', req, overrideAccess: false,
        context: { ...req.context, disableRevalidate: true },
        data: { ...settings, dateHours, closures, holidays },
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
