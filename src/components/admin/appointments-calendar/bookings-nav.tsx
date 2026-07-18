'use client'

import { Link, NavGroup, useConfig } from '@payloadcms/ui'
import { usePathname, useSearchParams } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'

type BookingLink = {
  href: string
  id: string
  label: string
}

export function BookingsNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { config } = useConfig()
  const adminRoute = config.routes.admin
  const links: BookingLink[] = [
    {
      href: formatAdminURL({ adminRoute, path: '/appointments-calendar' }),
      id: 'nav-appointments-calendar',
      label: 'Calendar',
    },
    {
      href: formatAdminURL({ adminRoute, path: '/collections/appointments' }),
      id: 'nav-appointments',
      label: 'Appointment records',
    },
    {
      href: formatAdminURL({ adminRoute, path: '/appointments-calendar?new=1' }),
      id: 'nav-new-appointment',
      label: 'New manual appointment',
    },
  ]

  return (
    <NavGroup isOpen label="Appointments">
      {links.map((link) => {
        const linkPath = link.href.split('?')[0]
        const onPath = pathname === linkPath || pathname.startsWith(`${linkPath}/`)
        const isActive = link.id === 'nav-new-appointment'
          ? onPath && searchParams.get('new') === '1'
          : link.id === 'nav-appointments-calendar'
            ? onPath && searchParams.get('new') !== '1'
            : onPath
        const content = (
          <>
            {isActive ? <div className="nav__link-indicator" /> : null}
            <span className="nav__link-label">{link.label}</span>
          </>
        )

        return isActive ? (
          <div className="nav__link" id={link.id} key={link.id}>
            {content}
          </div>
        ) : (
          <Link className="nav__link" href={link.href} id={link.id} key={link.id} prefetch={false}>
            {content}
          </Link>
        )
      })}
    </NavGroup>
  )
}
