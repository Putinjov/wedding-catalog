'use client'

import { Link, NavGroup, useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'

type BookingLink = {
  href: string
  id: string
  label: string
}

export function BookingsNav() {
  const pathname = usePathname()
  const { config } = useConfig()
  const adminRoute = config.routes.admin
  const links: BookingLink[] = [
    {
      href: formatAdminURL({ adminRoute, path: '/collections/appointments' }),
      id: 'nav-appointments',
      label: 'Appointments',
    },
    {
      href: formatAdminURL({ adminRoute, path: '/appointments-calendar' }),
      id: 'nav-appointments-calendar',
      label: 'Calendar',
    },
  ]

  return (
    <NavGroup isOpen label="Bookings">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
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
