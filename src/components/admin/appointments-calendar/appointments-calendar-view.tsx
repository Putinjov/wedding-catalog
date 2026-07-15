import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import { hasRole } from '@/access/roles'
import type { ManualAppointmentDress } from '@/lib/admin/appointments/calendarTypes'

import { AppointmentsCalendar } from './appointments-calendar'

export async function AppointmentsCalendarView(props: AdminViewServerProps) {
  // Payload owns the admin authentication flow. Redirecting manually from a
  // custom view can cause an RSC loop between the view and the login route.
  // During unauthenticated rendering, let Payload's admin shell handle login.
  if (!props.user) {
    return null
  }

  if (!hasRole(props.user, ['owner', 'manager', 'staff'])) {
    return (
      <DefaultTemplate {...props} visibleEntities={props.initPageResult.visibleEntities}>
        <section aria-labelledby="calendar-access-denied" style={{ maxWidth: '48rem' }}>
          <h1 id="calendar-access-denied">Access denied</h1>
          <p>You do not have permission to view the appointments calendar.</p>
        </section>
      </DefaultTemplate>
    )
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
