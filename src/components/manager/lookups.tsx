'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const collections = ['sizes','colors','fabrics','designers','silhouettes','necklines','sleeves','trains','backs','waistlines','embellishments'] as const
type Lookup = { id: string; name: string; description?: string | null; isActive?: boolean | null; sortOrder?: number | null }
type Form = { name: string; description: string; isActive: boolean; sortOrder: string }
const blank: Form = { name: '', description: '', isActive: true, sortOrder: '0' }
export function ManagerLookups() {
  const [collection, setCollection] = useState<(typeof collections)[number]>('sizes')
  const [docs, setDocs] = useState<Lookup[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(blank)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch('/api/' + collection + '?locale=en&depth=0&limit=50&sort=name&page=' + page, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Unable to load lookup values.')
        const data = await response.json()
        if (!controller.signal.aborted) { setDocs(data.docs); setPages(data.totalPages) }
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load lookups.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    })()
    return () => controller.abort()
  }, [collection, page, revision])
  async function save() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/' + collection + (editing ? '/' + encodeURIComponent(editing) : '') + '?locale=en', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sortOrder: Number(form.sortOrder), generateSlug: !editing })
      })
      if (!response.ok) { const data = await response.json(); throw new Error(data.errors?.[0]?.message || 'Unable to save lookup.') }
      setEditing(null); setForm(blank); setLoading(true); setRevision(value => value + 1)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save lookup.') }
    finally { setBusy(false) }
  }
  return <main className="manager-section"><Link href="/manager/dresses">← Dress catalogue</Link><h1>Catalogue attributes</h1>
    <label>Attribute type<select disabled={busy} value={collection} onChange={event => { setCollection(event.target.value as typeof collection); setPage(1); setEditing(null); setForm(blank); setLoading(true); setError('') }}>{collections.map(value => <option key={value}>{value}</option>)}</select></label>
    {error && <p role="alert">{error}</p>}
    <fieldset className="manager-panel manager-editor" disabled={busy}><legend>{editing ? 'Edit attribute' : 'New attribute'}</legend>
      <label>Name<input value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} /></label>
      <label>Description<textarea value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} /></label>
      <label>Sort order<input type="number" min="0" step="1" value={form.sortOrder} onChange={event => setForm(previous => ({ ...previous, sortOrder: event.target.value }))} /></label>
      <label><input type="checkbox" checked={form.isActive} onChange={event => setForm(previous => ({ ...previous, isActive: event.target.checked }))} /> Active</label>
      <button className="manager-primary" disabled={!form.name.trim() || !Number.isInteger(Number(form.sortOrder)) || Number(form.sortOrder) < 0} onClick={() => void save()}>Save attribute</button>
      {editing && <button onClick={() => { setEditing(null); setForm(blank) }}>Cancel editing</button>}
    </fieldset>
    <p className="manager-muted">Deactivate unused values rather than deleting attributes referenced by dresses.</p>
    {loading ? <p role="status">Loading…</p> : <>{docs.map(item => <button type="button" key={item.id} disabled={busy} className="manager-action" onClick={() => { setEditing(item.id); setForm({ name: item.name, description: item.description ?? '', isActive: item.isActive !== false, sortOrder: String(item.sortOrder ?? 0) }) }}>{item.name} · {item.isActive === false ? 'Inactive' : 'Active'}</button>)}<div className="manager-pagination"><button disabled={page <= 1 || busy} onClick={() => { setLoading(true); setPage(value => value - 1) }}>Previous</button><span>{page} / {Math.max(pages, 1)}</span><button disabled={page >= pages || busy} onClick={() => { setLoading(true); setPage(value => value + 1) }}>Next</button></div></>}
  </main>
}
