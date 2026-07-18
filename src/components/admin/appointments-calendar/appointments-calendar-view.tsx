import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import { hasRole } from '@/access/roles'
import type { ManualAppointmentDress } from '@/lib/admin/appointments/calendarTypes'

import { AppointmentsCalendar } from './appointments-calendar'

export async function AppointmentsCalendarView(props: AdminViewServerProps) {
  const user = props.initPageResult.req.user

  if (!user) {
    return (
      <DefaultTemplate {...props} visibleEntities={props.initPageResult.visibleEntities}>
        <section aria-labelledby="calendar-auth-required" style={{ maxWidth: '48rem' }}>
          <h1 id="calendar-auth-required">Authentication required</h1>
          <p>Sign in to Payload Admin to view the appointments calendar.</p>
        </section>
      </DefaultTemplate>
    )
  }

  if (!hasRole(user, ['owner', 'manager', 'staff'])) {
    return (
      <DefaultTemplate {...props} visibleEntities={props.initPageResult.visibleEntities}>
        <section aria-labelledby="calendar-access-denied" style={{ maxWidth: '48rem' }}>
          <h1 id="calendar-access-denied">Access denied</h1>
          <p>You do not have permission to view the appointments calendar.</p>
        </section>
      </DefaultTemplate>
    )
  }

  let dresses: ManualAppointmentDress[] = []
  let initialError = ''

  try {
    const result = await props.payload.find({
      collection: 'dresses',
      depth: 0,
      limit: 500,
      locale: 'en',
      overrideAccess: false,
      pagination: false,
      sort: 'name',
      user,
    })
    dresses = result.docs.map((dress) => ({
      id: dress.id,
      name: dress.name,
      slug: dress.slug,
      availableForRent: dress.availableForRent,
      forSale: dress.forSale,
    }))
  } catch {
    initialError = 'Dress options could not be loaded. Existing appointments are still available.'
  }

  return (
    <DefaultTemplate {...props} visibleEntities={props.initPageResult.visibleEntities}>
      <AppointmentsCalendar dresses={dresses} initialError={initialError} />
    </DefaultTemplate>
  )
}
