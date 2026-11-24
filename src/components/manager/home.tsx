'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDateKey, formatTimeForCustomer } from '@/lib/booking/date'
import { parseCalendarAppointments, type CalendarAppointment } from '@/lib/admin/appointments/calendarTypes'

export function ManagerHome() {
  const [items, setItems] = useState<CalendarAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const today = getDateKey()
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ from: today, to: today })
    void (async () => {
      try {
        const response = await fetch('/api/appointments/calendar?' + params, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Unable to load appointments.')
        const data = await response.json()
        setItems(parseCalendarAppointments(data.appointments))
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load appointments.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    })()
    return () => controller.abort()
  }, [today])
  return <main className="manager-section">
    <h1>Home</h1><p className="manager-muted">{new Intl.DateTimeFormat('en-IE', { dateStyle: 'full', timeZone: 'Europe/Dublin' }).format(new Date(today + 'T12:00:00Z'))}</p>
    <Link className="manager-primary" href="/manager?new=1">+ New appointment</Link>
    {loading ? <p role="status">Loading appointments…</p> : error ? <p role="alert">{error}</p> : <>
      <div className="manager-metrics">{[['Appointments', items.length], ['Confirmed', items.filter(item => item.status === 'confirmed').length], ['Pending payment', items.filter(item => item.status === 'pending_payment' || item.status === 'payment_processing').length]].map(([label, count]) => <div className="manager-panel" key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
      <section className="manager-panel"><h2>Today’s appointments</h2>
        {items.length === 0 ? <p className="manager-muted">No appointments scheduled.</p> : [...items].sort((a,b) => a.startAt.localeCompare(b.startAt)).map(item => <Link key={item.id} className="manager-action" href={'/manager?date=' + today + '&appointment=' + encodeURIComponent(String(item.id))}><span>{formatTimeForCustomer(item.startAt)} · {item.customerName}</span><small>{item.status.replaceAll('_', ' ')}</small></Link>)}
        <Link className="manager-action" href="/manager">Open calendar</Link>
      </section>
    </>}
  </main>
}
