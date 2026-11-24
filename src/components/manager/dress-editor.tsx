'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Dress } from '@/payload-types'

type Option = { id: string; label: string }
type Fields = { name: string; sku: string; category: string; shortDescription: string; saleStatus: Dress['saleStatus']; rentalStatus: Dress['rentalStatus']; publicVisibility: Dress['publicVisibility']; condition: Dress['condition']; salePrice: string; rentalPrice: string; salePriceOnRequest: boolean; mainImage: string; gallery: { image: string; alt?: string | null; id?: string | null }[] }
const initial: Fields = { name: '', sku: '', category: '', shortDescription: '', saleStatus: 'not-for-sale', rentalStatus: 'not-for-rent', publicVisibility: 'hidden', condition: 'new', salePrice: '', rentalPrice: '', salePriceOnRequest: false, mainImage: '', gallery: [] }
const idOf = (value: string | { id: string } | null | undefined) => typeof value === 'string' ? value : value?.id ?? ''
const money = (value: number | null | undefined) => value == null ? '' : String(value)
function fromDress(dress: Dress): Fields {
  return { name: dress.name ?? '', sku: dress.sku ?? '', category: idOf(dress.category), shortDescription: dress.shortDescription ?? '', saleStatus: dress.saleStatus ?? initial.saleStatus, rentalStatus: dress.rentalStatus ?? initial.rentalStatus, publicVisibility: dress.publicVisibility ?? initial.publicVisibility, condition: dress.condition ?? initial.condition, salePrice: money(dress.salePrice), rentalPrice: money(dress.rentalPrice), salePriceOnRequest: Boolean(dress.salePriceOnRequest), mainImage: idOf(dress.mainImage), gallery: (dress.gallery ?? []).map(row => ({ ...row, image: idOf(row.image) })) }
}
async function responseData(response: Response) {
  const data = await response.json()
  if (!response.ok) throw new Error(data.errors?.flatMap((error: { message?: string; data?: { errors?: { message: string }[] } }) => error.data?.errors?.map(item => item.message) ?? [error.message]).filter(Boolean).join('; ') || data.message || 'Request failed.')
  return data
}

export function DressEditor({ id }: { id: string }) {
  const router = useRouter()
  const creating = id === 'new'
  const [fields, setFields] = useState<Fields>(initial)
  const [categories, setCategories] = useState<Option[]>([])
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [previews, setPreviews] = useState<Record<string, string>>({})
  function change<K extends keyof Fields>(key: K, value: Fields[K]) { setFields(previous => ({ ...previous, [key]: value })) }
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const options = await responseData(await fetch('/api/categories?limit=100&depth=0&locale=en', { signal: controller.signal, cache: 'no-store' }))
        if (controller.signal.aborted) return
        setCategories(options.docs.map((item: { id: string; title: string }) => ({ id: item.id, label: item.title })))
        if (!creating) {
          const dress: Dress = await responseData(await fetch('/api/dresses/' + encodeURIComponent(id) + '?depth=1&draft=true&locale=en', { signal: controller.signal, cache: 'no-store' }))
          if (controller.signal.aborted) return
          setFields(fromDress(dress))
          setStatus(dress._status === 'published' ? 'published' : 'draft')
          const images = [dress.mainImage, ...(dress.gallery ?? []).map(row => row.image)]
          setPreviews(Object.fromEntries(images.flatMap(image => typeof image === 'object' && image?.url ? [[image.id, image.url]] : [])))
        }
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load dress.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    })()
    return () => controller.abort()
  }, [id, creating])

  async function upload(file: File, target: 'main' | 'gallery') {
    setBusy(true); setError(''); setNotice('')
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
      const form = new FormData()
      form.set('file', file)
      form.set('_payload', JSON.stringify({ alt: fields.name || file.name }))
      const data = await responseData(await fetch('/api/media', { method: 'POST', body: form }))
      const image = data.doc
      if (!image?.id) throw new Error('Upload returned no image ID.')
      if (image.url) setPreviews(previous => ({ ...previous, [image.id]: image.url }))
      if (target === 'main') change('mainImage', image.id)
      else setFields(previous => ({ ...previous, gallery: [...previous.gallery, { image: image.id, alt: previous.name }] }))
    } catch (error) { setError(error instanceof Error ? error.message : 'Upload failed.') }
    finally { setBusy(false) }
  }

  async function save(nextStatus: 'draft' | 'published') {
    setBusy(true); setError(''); setNotice('')
    try {
      const data = { ...fields, salePrice: fields.salePrice === '' ? null : Number(fields.salePrice), rentalPrice: fields.rentalPrice === '' ? null : Number(fields.rentalPrice), _status: nextStatus, ...(creating ? { generateSlug: true } : { generateSlug: false }) }
      const response = await fetch((creating ? '/api/dresses' : '/api/dresses/' + encodeURIComponent(id)) + '?locale=en&draft=' + String(nextStatus === 'draft'), { method: creating ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await responseData(response)
      if (creating) router.replace('/manager/dresses/' + encodeURIComponent(result.doc.id))
      else { setStatus(nextStatus); setNotice(nextStatus === 'published' ? 'Published.' : 'Draft saved.') }
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save dress.') }
    finally { setBusy(false) }
  }

  if (loading) return <main className="manager-section"><p role="status">Loading…</p></main>
  return <main className="manager-section">
    <Link href="/manager/dresses">← Dress catalogue</Link><h1>{creating ? 'New dress' : fields.name}</h1>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <fieldset disabled={busy} className="manager-panel manager-editor">
      <legend>General</legend>
      <label>Name<input value={fields.name} onChange={event => change('name', event.target.value)} /></label>
      <label>SKU<input value={fields.sku} onChange={event => change('sku', event.target.value)} /></label>
      <label>Category<select value={fields.category} onChange={event => change('category', event.target.value)}><option value="">Select category</option>{categories.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      <label>Short description<textarea maxLength={300} value={fields.shortDescription} onChange={event => change('shortDescription', event.target.value)} /></label>
      <label>Visibility<select value={fields.publicVisibility} onChange={event => change('publicVisibility', event.target.value as Fields['publicVisibility'])}>{['public','hidden','archived'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Condition<select value={fields.condition} onChange={event => change('condition', event.target.value as Fields['condition'])}>{['new','like-new','excellent','good','needs-cleaning','needs-repair'].map(value => <option key={value}>{value}</option>)}</select></label>
    </fieldset>
    <fieldset disabled={busy} className="manager-panel manager-editor"><legend>Sale &amp; rental</legend>
      <label>Sale status<select value={fields.saleStatus} onChange={event => change('saleStatus', event.target.value as Fields['saleStatus'])}>{['not-for-sale','available','reserved','sold'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Sale price (€)<input type="number" min="0" step="0.01" value={fields.salePrice} onChange={event => change('salePrice', event.target.value)} /></label>
      <label><input type="checkbox" checked={fields.salePriceOnRequest} onChange={event => change('salePriceOnRequest', event.target.checked)} /> Price on request</label>
      <label>Rental status<select value={fields.rentalStatus} onChange={event => change('rentalStatus', event.target.value as Fields['rentalStatus'])}>{['not-for-rent','available','reserved','rented','cleaning','repair'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Rental price (€)<input type="number" min="0" step="0.01" value={fields.rentalPrice} onChange={event => change('rentalPrice', event.target.value)} /></label>
    </fieldset>
    <fieldset disabled={busy} className="manager-panel manager-editor"><legend>Photos</legend>
      {fields.mainImage && <span>Main image selected</span>}
      {previews[fields.mainImage] && <a href={previews[fields.mainImage]} target="_blank" rel="noreferrer">View main image</a>}
      <label>Upload main photo<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, 'main'); event.target.value = '' }} /></label>
      {fields.gallery.map((row, index) => <div key={row.id ?? row.image + index} className="manager-action"><span>{previews[row.image] ? <a href={previews[row.image]} target="_blank" rel="noreferrer">Photo {index + 1}</a> : 'Photo ' + (index + 1)}</span><button onClick={() => change('gallery', fields.gallery.filter((_, i) => i !== index))}>Remove</button></div>)}
      <label>Add gallery photo<input type="file" accept="image/*" disabled={fields.gallery.length >= 20} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, 'gallery'); event.target.value = '' }} /></label>
    </fieldset>
    <p className="manager-muted">Current status: {status}. Removing a photo from the gallery does not delete the media asset.</p>
    <button className="manager-primary" disabled={busy || !fields.name.trim() || !fields.sku.trim()} onClick={() => void save('draft')}>Save draft</button>
    <button className="manager-primary" disabled={busy || !fields.name.trim() || !fields.sku.trim() || !fields.category || !fields.mainImage} onClick={() => void save('published')}>Publish</button>
  </main>
}
