'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, CalendarDays, Users, Menu } from 'lucide-react'

const links = [
  { href: '/manager/home', label: 'Home', Icon: House },
  { href: '/manager', label: 'Calendar', Icon: CalendarDays },
  { href: '/manager/clients', label: 'Clients', Icon: Users },
  { href: '/manager/more', label: 'More', Icon: Menu },
]
export function ManagerNavigation() {
  const pathname = usePathname()
  return <nav className="manager-nav" aria-label="Management">{links.map(({ href, label, Icon }) => (
    <Link key={href} href={href} aria-current={pathname === href || (href !== '/manager' && pathname.startsWith(href + '/')) ? 'page' : undefined}><Icon size={20} aria-hidden="true" />{label}</Link>
  ))}</nav>
}
