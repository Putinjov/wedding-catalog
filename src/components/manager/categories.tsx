'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Category } from '@/payload-types'

const idOf = (value: string | { id: string } | null | undefined) => typeof value === 'string' ? value : value?.id ?? ''
const initial = { title: '', description: '', image: '', parent: '', isActive: true, sortOrder: '0' }
export function ManagerCategories() {
  const [docs, setDocs] = useState<Category[]>([])
  const [editing, setEditing] = useState('')
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [media, setMedia] = useState<{ id: string; filename?: string | null }[]>([])
  const [mediaPage, setMediaPage] = useState(1)
  const [mediaPages, setMediaPages] = useState(1)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const all: Category[] = []
        let page = 1
        let total = 1
        do {
          const response = await fetch('/api/categories?depth=0&limit=100&locale=en&page=' + page, { signal: controller.signal, cache: 'no-store' })
          if (!response.ok) throw new Error('Unable to load categories.')
          const data = await response.json()
          all.push(...data.docs); total = data.totalPages; page++
        } while (page <= total)
        if (!controller.signal.aborted) setDocs(all)
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load categories.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    })()
    return () => controller.abort()
  }, [revision])
  async function browse(page: number) {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/media?depth=0&limit=24&where[mimeType][contains]=image/&page=' + page)
      if (!response.ok) throw new Error('Unable to load media.')
      const data = await response.json()
      setMedia(data.docs); setMediaPage(page); setMediaPages(data.totalPages)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to load media.') }
    finally { setBusy(false) }
  }
  async function upload(file: File) {
    setBusy(true); setError('')
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image.')
      const body = new FormData()
      body.set('file', file); body.set('_payload', JSON.stringify({ alt: form.title || file.name }))
      const response = await fetch('/api/media', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok || !data.doc?.id) throw new Error('Upload failed.')
      setForm(previous => ({ ...previous, image: data.doc.id }))
    } catch (error) { setError(error instanceof Error ? error.message : 'Upload failed.') }
    finally { setBusy(false) }
  }
  function validParent(parent: string) {
    const seen = new Set([editing])
    let current = parent
    while (current) {
      if (seen.has(current)) return false
      seen.add(current)
      current = idOf(docs.find(item => item.id === current)?.parent)
    }
    return true
  }
  async function save() {
    if (!validParent(form.parent)) { setError('Category hierarchy cannot contain a cycle.'); return }
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/categories' + (editing ? '/' + encodeURIComponent(editing) : '') + '?locale=en', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, parent: form.parent || null, sortOrder: Number(form.sortOrder), ...(editing ? { generateSlug: false } : {}) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.errors?.[0]?.message || 'Unable to save category.')
      setEditing(''); setForm(initial); setLoading(true); setRevision(value => value + 1)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save category.') }
    finally { setBusy(false) }
  }
  return <main className="manager-section"><Link href="/manager/dresses">← Dress catalogue</Link><h1>Categories</h1>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy || loading} className="manager-panel manager-editor"><legend>{editing ? 'Edit category' : 'New category'}</legend>
      <label>Title<input value={form.title} onChange={event => setForm(previous => ({ ...previous, title: event.target.value }))} /></label>
      <label>Description<textarea value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} /></label>
      <label>Parent category<select value={form.parent} onChange={event => setForm(previous => ({ ...previous, parent: event.target.value }))}><option value="">None</option>{docs.filter(item => validParent(item.id)).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>Sort order<input type="number" min="0" step="1" value={form.sortOrder} onChange={event => setForm(previous => ({ ...previous, sortOrder: event.target.value }))} /></label>
      <label><input type="checkbox" checked={form.isActive} onChange={event => setForm(previous => ({ ...previous, isActive: event.target.checked }))} /> Active</label>
      <p>{form.image ? 'Image selected' : 'Image required'}</p>
      <label>Upload image<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }} /></label>
      <button type="button" onClick={() => void browse(1)}>Choose from media library</button>
      {media.length > 0 && <><label>Media<select value={form.image} onChange={event => setForm(previous => ({ ...previous, image: event.target.value }))}><option value="">Select image</option>{media.map(item => <option key={item.id} value={item.id}>{item.filename || item.id}</option>)}</select></label><div className="manager-pagination"><button disabled={mediaPage <= 1} onClick={() => void browse(mediaPage - 1)}>Previous</button><button disabled={mediaPage >= mediaPages} onClick={() => void browse(mediaPage + 1)}>Next</button></div></>}
      <button className="manager-primary" disabled={!form.title.trim() || !form.image || !Number.isInteger(Number(form.sortOrder)) || Number(form.sortOrder) < 0} onClick={() => void save()}>Save category</button>
      {editing && <button onClick={() => { setEditing(''); setForm(initial) }}>Cancel editing</button>}
    </fieldset>
    {loading ? <p>Loading…</p> : docs.map(item => <button key={item.id} className="manager-action" disabled={busy} onClick={() => { setEditing(item.id); setForm({ title: item.title, description: item.description ?? '', image: idOf(item.image), parent: idOf(item.parent), isActive: item.isActive !== false, sortOrder: String(item.sortOrder ?? 0) }) }}>{item.title} · {item.isActive === false ? 'Inactive' : 'Active'}</button>)}
  </main>
}
