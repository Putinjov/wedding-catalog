import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { hasRole } from '@/access/roles'
import { withAdminBookingWindow } from '@/config/booking'
import { AppointmentsCalendar } from '@/components/admin/appointments-calendar/appointments-calendar'
import type { ManualAppointmentDress } from '@/lib/admin/appointments/calendarTypes'
import { getBookingSettingsFromPayload } from '@/lib/booking/settings'
import { isDressAvailableForMode } from '@/lib/dress-utils'

export const dynamic = 'force-dynamic'

export default async function ManagerPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || !hasRole(user, ['owner', 'manager', 'staff'])) redirect('/admin/login')

  const settings = await getBookingSettingsFromPayload(payload)
  let dresses: ManualAppointmentDress[] = []
  let initialError = ''
  try {
    const result = await payload.find({
      collection: 'dresses', depth: 0, limit: 500, locale: 'en',
      overrideAccess: false, pagination: false, sort: 'name', user,
    })
    dresses = result.docs.map((dress) => ({
      id: dress.id, name: dress.name, slug: dress.slug,
      availableForBuy: isDressAvailableForMode(dress, 'buy'),
      availableForRent: isDressAvailableForMode(dress, 'rent'),
    }))
  } catch {
    initialError = 'Dress options could not be loaded.'
  }

  return <AppointmentsCalendar canManageAvailability={hasRole(user, ['owner', 'manager'])} dresses={dresses} initialError={initialError} settings={withAdminBookingWindow(settings)} />
}
