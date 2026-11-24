'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ClientDirectoryEntry, ClientProfile } from '@/lib/admin/appointments/clientDirectory'
import { formatDateTimeForCustomer, getDateKey } from '@/lib/booking/date'

export function ManagerClients() {
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      const path = selected ? '/api/appointments/clients/' + encodeURIComponent(selected) : '/api/appointments/clients?' + new URLSearchParams({ search: search.trim(), limit: '100' })
      void (async () => {
        try {
          const response = await fetch(path, { signal: controller.signal, cache: 'no-store' })
          if (!response.ok) throw new Error('Unable to load client information.')
          const data = await response.json()
          if (controller.signal.aborted) return
          if (selected) setProfile(data.client)
          else setClients(data.clients)
        } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load clients.') }
        finally { if (!controller.signal.aborted) setLoading(false) }
      })()
    }, 250)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [search, selected])
  return <main className="manager-section"><h1>Clients</h1>
    {selected ? <button className="manager-action" onClick={() => { setProfile(null); setSelected(null) }}>Back to clients</button> : <label className="manager-search">Search clients<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, email or phone" /></label>}
    {loading && <p role="status">Loading…</p>}{error && <p role="alert">{error}</p>}
    {!loading && !error && (selected ? profile && <section className="manager-panel"><h2>{profile.name}</h2><p>{profile.email}</p><p>{profile.phone}</p><h3>Appointment history</h3>{profile.appointments.map(item => <Link className="manager-action" key={item.id} href={'/manager?date=' + getDateKey(new Date(item.startAt)) + '&appointment=' + encodeURIComponent(String(item.id))}><span>{formatDateTimeForCustomer(item.startAt)}</span><small>{item.status.replaceAll('_', ' ')}</small></Link>)}</section> : <section className="manager-panel">{clients.length === 0 ? <p>No clients found.</p> : clients.map(client => <button className="manager-action" key={client.id} onClick={() => { setProfile(null); setSelected(client.id); setLoading(true) }}><span>{client.name}<small>{client.email}</small></span><small>{client.totalAppointments} visits</small></button>)}{clients.length === 100 && <p className="manager-muted">Showing up to 100 clients. Refine your search.</p>}</section>)}
  </main>
}
