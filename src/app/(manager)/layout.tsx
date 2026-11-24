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
        <header className="manager-brand"><a href="/manager">CÀIT BRIDAL</a><span>Management Studio</span></header>
        <nav className="manager-nav" aria-label="Management">
          <a href="/manager" aria-current="page">Calendar</a>
          <a href="/manager?new=1">New appointment</a>
          <a href="/admin">Administration</a>
        </nav>
        <div className="manager-content">{children}</div>
      </body>
    </html>
  )
}
