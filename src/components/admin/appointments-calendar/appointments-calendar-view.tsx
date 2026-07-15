import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import type { ManualAppointmentDress } from '@/lib/admin/appointments/calendarTypes'

import { AppointmentsCalendar } from './appointments-calendar'

export async function AppointmentsCalendarView(props: AdminViewServerProps) {
  if (!props.user) {
    redirect('/admin/login?redirect=%2Fadmin%2Fappointments-calendar')
  }

  const result = await props.payload.find({
    collection: 'dresses',
    depth: 0,
    limit: 500,
    locale: 'en',
    overrideAccess: false,
    pagination: false,
    sort: 'name',
    user: props.user,
  })
  const dresses: ManualAppointmentDress[] = result.docs.map((dress) => ({
    id: dress.id,
    name: dress.name,
    slug: dress.slug,
    availableForRent: dress.availableForRent,
    forSale: dress.forSale,
  }))

  return (
    <DefaultTemplate {...props} visibleEntities={props.initPageResult.visibleEntities}>
      <AppointmentsCalendar dresses={dresses} />
    </DefaultTemplate>
  )
}
