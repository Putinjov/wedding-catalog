import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import type { ManualAppointmentDress } from '@/lib/admin/appointments/calendarTypes'
import { hasRole } from '@/access/roles'

import { AppointmentsCalendar } from './appointments-calendar'

export async function AppointmentsCalendarView(props: AdminViewServerProps) {
  // Payload owns the admin authentication flow. Redirecting manually from a
  // custom view can cause an RSC loop between the view and the login route.
  // During unauthenticated rendering, let Payload's admin shell handle login.
  if (!props.user) {
    return null
  }
  if (!hasRole(props.user, ['owner', 'manager', 'staff'])) {
    redirect('/admin')
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
