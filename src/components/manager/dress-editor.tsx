'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { Dress } from '@/payload-types'

type Option = { id: string; label: string }
const singleRelations = ["designer","silhouette","neckline","sleeves","train","back","waistline"] as const
const multipleRelations = ["sizes","colors","fabrics","embellishments"] as const
const relationCollections = { designer: 'designers', silhouette: 'silhouettes', neckline: 'necklines', sleeves: 'sleeves', train: 'trains', back: 'backs', waistline: 'waistlines', sizes: 'sizes', colors: 'colors', fabrics: 'fabrics', embellishments: 'embellishments' } as const
type Fields = { designer: string; silhouette: string; neckline: string; sleeves: string; train: string; back: string; waistline: string; sizes: string[]; colors: string[]; fabrics: string[]; embellishments: string[]; collectionName: string; fitNotes: string; alterationPossibilities: string; alterationLimitations: string; videoUrl: string; previousSalePrice: string; securityDeposit: string; rentalPeriodDays: string; displayOrder: string; featured: boolean;  name: string; sku: string; category: string; shortDescription: string; saleStatus: Dress['saleStatus']; rentalStatus: Dress['rentalStatus']; publicVisibility: Dress['publicVisibility']; condition: Dress['condition']; salePrice: string; rentalPrice: string; salePriceOnRequest: boolean; mainImage: string; gallery: { image: string; alt?: string | null; id?: string | null }[] }
const initial: Fields = { designer: '', silhouette: '', neckline: '', sleeves: '', train: '', back: '', waistline: '', sizes: [], colors: [], fabrics: [], embellishments: [], collectionName: '', fitNotes: '', alterationPossibilities: '', alterationLimitations: '', videoUrl: '', previousSalePrice: '', securityDeposit: '', rentalPeriodDays: '4', displayOrder: '0', featured: false,  name: '', sku: '', category: '', shortDescription: '', saleStatus: 'not-for-sale', rentalStatus: 'not-for-rent', publicVisibility: 'hidden', condition: 'new', salePrice: '', rentalPrice: '', salePriceOnRequest: false, mainImage: '', gallery: [] }
const idOf = (value: string | { id: string } | null | undefined) => typeof value === 'string' ? value : value?.id ?? ''
const money = (value: number | null | undefined) => value == null ? '' : String(value)
function fromDress(dress: Dress): Fields {
  return { designer: idOf(dress.designer), silhouette: idOf(dress.silhouette), neckline: idOf(dress.neckline), sleeves: idOf(dress.sleeves), train: idOf(dress.train), back: idOf(dress.back), waistline: idOf(dress.waistline), sizes: (dress.sizes ?? []).map(idOf), colors: (dress.colors ?? []).map(idOf), fabrics: (dress.fabrics ?? []).map(idOf), embellishments: (dress.embellishments ?? []).map(idOf), collectionName: dress.collectionName ?? '', fitNotes: dress.fitNotes ?? '', alterationPossibilities: dress.alterationPossibilities ?? '', alterationLimitations: dress.alterationLimitations ?? '', videoUrl: dress.videoUrl ?? '', previousSalePrice: money(dress.previousSalePrice), securityDeposit: money(dress.securityDeposit), rentalPeriodDays: money(dress.rentalPeriodDays), displayOrder: money(dress.displayOrder), featured: Boolean(dress.featured), name: dress.name ?? '', sku: dress.sku ?? '', category: idOf(dress.category), shortDescription: dress.shortDescription ?? '', saleStatus: dress.saleStatus ?? initial.saleStatus, rentalStatus: dress.rentalStatus ?? initial.rentalStatus, publicVisibility: dress.publicVisibility ?? initial.publicVisibility, condition: dress.condition ?? initial.condition, salePrice: money(dress.salePrice), rentalPrice: money(dress.rentalPrice), salePriceOnRequest: Boolean(dress.salePriceOnRequest), mainImage: idOf(dress.mainImage), gallery: (dress.gallery ?? []).map(row => ({ ...row, image: idOf(row.image) })) }
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
  const [relations, setRelations] = useState<Partial<Record<keyof typeof relationCollections, Option[]>>>({})
  const [categories, setCategories] = useState<Option[]>([])
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [media, setMedia] = useState<{ id: string; url?: string | null; filename?: string | null }[]>([])
  const [mediaPage, setMediaPage] = useState(1)
  const [mediaPages, setMediaPages] = useState(1)
  const [mediaOpen, setMediaOpen] = useState<'main' | 'gallery' | null>(null)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  function change<K extends keyof Fields>(key: K, value: Fields[K]) { setFields(previous => ({ ...previous, [key]: value })) }
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const options = await responseData(await fetch('/api/categories?limit=100&depth=0&locale=en', { signal: controller.signal, cache: 'no-store' }))
        if (controller.signal.aborted) return
        setCategories(options.docs.map((item: { id: string; title: string }) => ({ id: item.id, label: item.title })))
        const entries = await Promise.all(Object.entries(relationCollections).map(async ([key, collection]) => {
          const docs: Option[] = []
          let page = 1
          let totalPages = 1
          do {
            const data = await responseData(await fetch('/api/' + collection + '?limit=100&depth=0&locale=en&page=' + page, { signal: controller.signal, cache: 'no-store' }))
            docs.push(...data.docs.map((item: { id: string; name: string }) => ({ id: item.id, label: item.name })))
            totalPages = data.totalPages
            page++
          } while (page <= totalPages)
          return [key, docs] as const
        }))
        if (controller.signal.aborted) return
        setRelations(Object.fromEntries(entries))
        if (!creating) {
          const dress: Dress = await responseData(await fetch('/api/dresses/' + encodeURIComponent(id) + '?depth=1&draft=true&locale=en', { signal: controller.signal, cache: 'no-store' }))
          if (controller.signal.aborted) return
          setFields(fromDress(dress))
          setStatus(dress._status === 'published' ? 'published' : 'draft')
          const images = [dress.mainImage, ...(dress.gallery ?? []).map(row => row.image)]
          setPreviews(Object.fromEntries(images.flatMap(image => typeof image === 'object' && image?.url ? [[image.id, image.url]] : [])))
        }
        setLoaded(true)
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load dress.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    })()
    return () => controller.abort()
  }, [id, creating])

  async function browseMedia(target: 'main' | 'gallery', page = 1) {
    setMediaOpen(target); setMediaLoading(true); setError('')
    try {
      const data = await responseData(await fetch('/api/media?depth=0&limit=24&sort=-createdAt&page=' + page + '&where[mimeType][contains]=image/', { cache: 'no-store' }))
      setMedia(data.docs); setMediaPage(page); setMediaPages(data.totalPages)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to load media.') }
    finally { setMediaLoading(false) }
  }

  function selectMedia(image: { id: string; url?: string | null }) {
    if (image.url) setPreviews(previous => ({ ...previous, [image.id]: image.url! }))
    if (mediaOpen === 'main') change('mainImage', image.id)
    else if (mediaOpen === 'gallery' && fields.gallery.length < 20) change('gallery', [...fields.gallery, { image: image.id, alt: fields.name }])
    setMediaOpen(null)
  }

  function movePhoto(index: number, offset: number) {
    const next = [...fields.gallery]
    const target = index + offset
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    change('gallery', next)
  }

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
      const data = { ...fields, designer: fields.designer || null, silhouette: fields.silhouette || null, neckline: fields.neckline || null, sleeves: fields.sleeves || null, train: fields.train || null, back: fields.back || null, waistline: fields.waistline || null, previousSalePrice: fields.previousSalePrice === '' ? null : Number(fields.previousSalePrice), securityDeposit: fields.securityDeposit === '' ? null : Number(fields.securityDeposit), rentalPeriodDays: fields.rentalPeriodDays === '' ? null : Number(fields.rentalPeriodDays), displayOrder: fields.displayOrder === '' ? 0 : Number(fields.displayOrder), salePrice: fields.salePrice === '' ? null : Number(fields.salePrice), rentalPrice: fields.rentalPrice === '' ? null : Number(fields.rentalPrice), _status: nextStatus, ...(creating ? { generateSlug: true } : { generateSlug: false }) }
      const response = await fetch((creating ? '/api/dresses' : '/api/dresses/' + encodeURIComponent(id)) + '?locale=en&draft=' + String(nextStatus === 'draft'), { method: creating ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await responseData(response)
      if (creating) router.replace('/manager/dresses/' + encodeURIComponent(result.doc.id))
      else { setStatus(nextStatus); setNotice(nextStatus === 'published' ? 'Published.' : 'Draft saved.') }
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save dress.') }
    finally { setBusy(false) }
  }

  if (loading) return <main className="manager-section"><p role="status">Loading…</p></main>
  if (!loaded) return <main className="manager-section"><Link href="/manager/dresses">Back to catalogue</Link><p role="alert">{error || 'Unable to load dress.'}</p></main>
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
    <fieldset disabled={busy} className="manager-panel manager-editor"><legend>Specifications</legend>
      <label>Collection<input value={fields.collectionName} onChange={event => change('collectionName', event.target.value)} /></label>
      {singleRelations.map(key => <label key={key}>{key}<select value={fields[key]} onChange={event => change(key, event.target.value)}><option value="">None</option>{(relations[key] ?? []).map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>)}
      {multipleRelations.map(key => <div key={key}><strong>{key}</strong><div className="manager-choice-grid">{(relations[key] ?? []).map(option => <label key={option.id}><input type="checkbox" checked={fields[key].includes(option.id)} onChange={event => change(key, event.target.checked ? [...fields[key], option.id] : fields[key].filter(value => value !== option.id))} />{option.label}</label>)}</div></div>)}
      <label><input type="checkbox" checked={fields.featured} onChange={event => change('featured', event.target.checked)} /> Featured dress</label>
      <label>Display order<input type="number" min="0" step="1" value={fields.displayOrder} onChange={event => change('displayOrder', event.target.value)} /></label>
    </fieldset>
    <fieldset disabled={busy} className="manager-panel manager-editor"><legend>Fit &amp; alterations</legend>
      <label>Fit notes<textarea value={fields.fitNotes} onChange={event => change('fitNotes', event.target.value)} /></label>
      <label>Alteration possibilities<textarea value={fields.alterationPossibilities} onChange={event => change('alterationPossibilities', event.target.value)} /></label>
      <label>Alteration limitations<textarea value={fields.alterationLimitations} onChange={event => change('alterationLimitations', event.target.value)} /></label>
    </fieldset>
    <fieldset disabled={busy} className="manager-panel manager-editor"><legend>Sale &amp; rental</legend>
      <label>Sale status<select value={fields.saleStatus} onChange={event => change('saleStatus', event.target.value as Fields['saleStatus'])}>{['not-for-sale','available','reserved','sold'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Sale price (€)<input type="number" min="0" step="0.01" value={fields.salePrice} onChange={event => change('salePrice', event.target.value)} /></label>
      <label><input type="checkbox" checked={fields.salePriceOnRequest} onChange={event => change('salePriceOnRequest', event.target.checked)} /> Price on request</label>
      <label>Rental status<select value={fields.rentalStatus} onChange={event => change('rentalStatus', event.target.value as Fields['rentalStatus'])}>{['not-for-rent','available','reserved','rented','cleaning','repair'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Previous sale price (€)<input type="number" min="0" step="0.01" value={fields.previousSalePrice} onChange={event => change('previousSalePrice', event.target.value)} /></label>
      <label>Security deposit (€)<input type="number" min="0" step="0.01" value={fields.securityDeposit} onChange={event => change('securityDeposit', event.target.value)} /></label>
      <label>Rental period (days)<input type="number" min="1" step="1" value={fields.rentalPeriodDays} onChange={event => change('rentalPeriodDays', event.target.value)} /></label>
      <label>Rental price (€)<input type="number" min="0" step="0.01" value={fields.rentalPrice} onChange={event => change('rentalPrice', event.target.value)} /></label>
    </fieldset>
    <fieldset disabled={busy} className="manager-panel manager-editor"><legend>Photos</legend>
      <label>Video URL<input type="url" value={fields.videoUrl} onChange={event => change('videoUrl', event.target.value)} /></label>
      {fields.mainImage && <span>Main image selected</span>}
      {previews[fields.mainImage] && <Image unoptimized src={previews[fields.mainImage]} alt="Main dress photo" width={160} height={200} className="manager-photo" />}
      <button type="button" onClick={() => void browseMedia('main')}>Choose main photo from library</button>
      <label>Upload main photo<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, 'main'); event.target.value = '' }} /></label>
      {fields.gallery.map((row, index) => <div key={row.id ?? row.image + index} className="manager-gallery-row">
        {previews[row.image] && <Image unoptimized src={previews[row.image]} alt={row.alt || 'Dress photo'} width={90} height={120} className="manager-photo" />}
        <label>Photo {index + 1} alt text<input value={row.alt ?? ''} onChange={event => change('gallery', fields.gallery.map((item, i) => i === index ? { ...item, alt: event.target.value } : item))} /></label>
        <div className="manager-pagination"><button disabled={index === 0} onClick={() => movePhoto(index, -1)}>Up</button><button disabled={index === fields.gallery.length - 1} onClick={() => movePhoto(index, 1)}>Down</button><button onClick={() => change('gallery', fields.gallery.filter((_, i) => i !== index))}>Remove</button></div>
      </div>)}
      <button type="button" disabled={fields.gallery.length >= 20} onClick={() => void browseMedia('gallery')}>Choose gallery photo from library</button>
      {mediaOpen && <section aria-label="Media library"><h3>Media library</h3><button onClick={() => setMediaOpen(null)}>Close library</button>
        {mediaLoading ? <p role="status">Loading photos…</p> : <><div className="manager-media-grid">{media.map(image => <button type="button" key={image.id} onClick={() => selectMedia(image)}>{image.url && <Image unoptimized src={image.url} width={100} height={120} alt={image.filename || 'Media photo'} className="manager-photo" />}<small>{image.filename || image.id}</small></button>)}</div><div className="manager-pagination"><button disabled={mediaPage <= 1} onClick={() => void browseMedia(mediaOpen, mediaPage - 1)}>Previous</button><span>{mediaPage} / {mediaPages}</span><button disabled={mediaPage >= mediaPages} onClick={() => void browseMedia(mediaOpen, mediaPage + 1)}>Next</button></div></>}
      </section>}
      <label>Add gallery photo<input type="file" accept="image/*" disabled={fields.gallery.length >= 20} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, 'gallery'); event.target.value = '' }} /></label>
    </fieldset>
    <p className="manager-muted">Current status: {status}. Removing a photo from the gallery does not delete the media asset.</p>
    <button className="manager-primary" disabled={busy || !fields.name.trim() || !fields.sku.trim()} onClick={() => void save('draft')}>Save draft</button>
    <button className="manager-primary" disabled={busy || !fields.name.trim() || !fields.sku.trim() || !fields.category || !fields.mainImage} onClick={() => void save('published')}>Publish</button>
  </main>
}
