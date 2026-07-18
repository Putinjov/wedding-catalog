import { CalendarDays, CalendarPlus, Clock3, Shirt } from 'lucide-react'
import React from 'react'

import { hasRole } from '@/access/roles'
import { getDateKey } from '@/lib/booking/date'

import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC<{ user?: unknown }> = ({ user }) => {
  const today = getDateKey()
  const shortcuts = [
    {
      description: 'Open the primary month or week schedule.',
      href: '/admin/appointments-calendar',
      icon: CalendarDays,
      label: 'Calendar',
    },
    {
      description: 'Add a phone, walk-in or staff-created booking.',
      href: '/admin/appointments-calendar?new=1',
      icon: CalendarPlus,
      label: 'New manual appointment',
    },
    ...(hasRole(user, ['owner', 'manager'])
      ? [{
          description: 'Update catalogue availability, pricing and imagery.',
          href: '/admin/collections/dresses',
          icon: Shirt,
          label: 'Dresses',
        }]
      : []),
    {
      description: 'Review today’s fitting schedule in Dublin time.',
      href: `/admin/appointments-calendar?date=${today}&view=day`,
      icon: Clock3,
      label: 'Today’s appointments',
    },
  ]

  return (
    <section className={baseClass} aria-labelledby="operations-heading">
      <p className={`${baseClass}__eyebrow`}>CAIT Bridal operations</p>
      <h2 id="operations-heading">Appointments at a glance</h2>
      <p className={`${baseClass}__intro`}>
        Start with the calendar for daily salon work. Payment records remain protected and are
        updated only by the existing Stripe flow.
      </p>
      <div className={`${baseClass}__shortcuts`}>
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon
          return (
            <a href={shortcut.href} key={shortcut.href}>
              <Icon aria-hidden="true" />
              <strong>{shortcut.label}</strong>
              <span>{shortcut.description}</span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

export default BeforeDashboard
