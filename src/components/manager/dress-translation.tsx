'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Dress } from '@/payload-types'
import { DescriptionEditor } from './description-editor'

const textKeys = ['name', 'shortDescription', 'fitNotes', 'alterationPossibilities', 'alterationLimitations'] as const
const labels = { name: 'Name', shortDescription: 'Short description', fitNotes: 'Fit notes', alterationPossibilities: 'Alteration possibilities', alterationLimitations: 'Alteration limitations' }
export function DressTranslation({ id }: { id: string }) {
  const [source, setSource] = useState<Dress | null>(null)
  const [fields, setFields] = useState<Partial<Dress>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const url = '/api/dresses/' + encodeURIComponent(id)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const [en, uk] = await Promise.all(['en', 'uk'].map(async locale => {
          const response = await fetch(url + '?depth=0&draft=true&fallback-locale=none&locale=' + locale, { signal: controller.signal, cache: 'no-store' })
          if (!response.ok) throw new Error('Unable to load translation.')
          return await response.json() as Dress
        }))
        if (controller.signal.aborted) return
        setFields(uk); setSource(en)
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load translation.') }
    })()
    return () => controller.abort()
  }, [url])
  async function save() {
    if (!source) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(url + '?locale=uk&draft=' + String(source._status !== 'published'), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(textKeys.map(key => [key, fields[key] ?? ''])), description: fields.description ?? null, generateSlug: false, _status: source._status === 'published' ? 'published' : 'draft' })
      })
      if (!response.ok) { const data = await response.json(); throw new Error(data.errors?.[0]?.message || 'Unable to save translation.') }
      setNotice('Ukrainian translation saved.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save translation.') }
    finally { setBusy(false) }
  }
  return <main className="manager-section"><Link href={'/manager/dresses/' + encodeURIComponent(id)}>← Dress editor</Link><h1>Ukrainian translation</h1>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!source ? <p>{error ? 'Translation unavailable.' : 'Loading…'}</p> : <fieldset disabled={busy} className="manager-panel manager-editor">
      <legend>Українська</legend>
      {textKeys.map(key => <label key={key}>{labels[key]}<small>English: {source[key] || '—'}</small><textarea maxLength={key === 'shortDescription' ? 300 : undefined} value={fields[key] ?? ''} onChange={event => setFields(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
      <DescriptionEditor value={fields.description ?? null} onChange={description => setFields(previous => ({ ...previous, description }))} />
      <button type="button" className="manager-primary" disabled={!fields.name?.trim()} onClick={() => void save()}>Save translation</button>
    </fieldset>}
  </main>
}
