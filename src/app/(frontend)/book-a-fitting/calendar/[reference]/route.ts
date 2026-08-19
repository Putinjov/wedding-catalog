import { buildAppointmentCalendar } from '@/lib/booking/appointmentCalendar'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
import { getBookingSettings } from '@/lib/booking/settings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

type Args = {
  params: Promise<{ reference?: string }>
}

export async function GET(_request: Request, { params }: Args): Promise<Response> {
  const { reference = '' } = await params
  const appointment = await getAppointmentByReference(reference)

  if (
    !appointment ||
    appointment.status !== 'confirmed' ||
    appointment.paymentStatus !== 'paid'
  ) {
    return new Response('Calendar event not found.', {
      headers: privateHeaders,
      status: 404,
    })
  }

  const settings = await getBookingSettings()
  const calendar = buildAppointmentCalendar({
    appointment,
    visitDetails: settings.visitDetails,
  })

  return new Response(calendar, {
    headers: {
      ...privateHeaders,
      'Content-Disposition': 'attachment; filename="cait-bridal-fitting.ics"',
      'Content-Type': 'text/calendar; charset=utf-8',
    },
  })
}
