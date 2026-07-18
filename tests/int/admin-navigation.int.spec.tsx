import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { appointmentTeam, ownerOnly, ownerOrManager } from '@/access/roles'
import BeforeDashboard from '@/components/BeforeDashboard'
import { AppointmentAudits } from '@/collections/AppointmentAudits'
import { Dresses } from '@/collections/Dresses'
import { Pages } from '@/collections/Pages'

function requestFor(role: 'owner' | 'manager' | 'staff') {
  return { req: { user: { id: `${role}-id`, role } } } as never
}

describe('Payload admin navigation and roles', () => {
  it('keeps staff focused on appointments while managers can manage content', () => {
    expect(appointmentTeam(requestFor('staff'))).toBe(true)
    expect(ownerOrManager(requestFor('staff'))).toBe(false)
    expect(ownerOrManager(requestFor('manager'))).toBe(true)
    expect(ownerOnly(requestFor('manager'))).toBe(false)
  })

  it('groups operational and technical collections into the intended sections', () => {
    expect(Dresses.admin?.group).toBe('Dresses')
    expect(Pages.admin?.group).toBe('Content')
    expect(AppointmentAudits.admin?.group).toBe('Administration')
  })

  it('shows staff only appointment shortcuts and adds Dresses for managers', () => {
    const staff = renderToStaticMarkup(<BeforeDashboard user={{ role: 'staff' }} />)
    const manager = renderToStaticMarkup(<BeforeDashboard user={{ role: 'manager' }} />)

    expect(staff).toContain('Calendar')
    expect(staff).toContain('New manual appointment')
    expect(staff).not.toContain('Update catalogue availability')
    expect(manager).toContain('Update catalogue availability')
  })
})
