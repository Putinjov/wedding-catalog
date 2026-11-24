import Link from 'next/link'
import { ManagerNavigation } from '@/components/manager/navigation'
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
        <ManagerNavigation />
        <div className="manager-content">{children}</div>
      </body>
    </html>
  )
}
