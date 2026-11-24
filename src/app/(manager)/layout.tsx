import Link from 'next/link'
import { CalendarDays, Plus, Settings } from 'lucide-react'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './manager.css'

export const metadata: Metadata = {
  title: 'Manager | CAIT Bridal',
  robots: { index: false, follow: false },
}

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="manager-workspace">
        <header className="manager-brand"><Link href="/manager">CÀIT BRIDAL</Link><span>Management Studio</span></header>
        <nav className="manager-nav" aria-label="Management">
          <Link href="/manager" aria-current="page"><CalendarDays aria-hidden="true" size={20} />Calendar</Link>
          <Link href="/manager?new=1"><Plus aria-hidden="true" size={20} />New appointment</Link>
          <Link href="/admin"><Settings aria-hidden="true" size={20} />Administration</Link>
        </nav>
        <div className="manager-content">{children}</div>
      </body>
    </html>
  )
}
