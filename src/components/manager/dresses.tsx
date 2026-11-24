'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Dress } from '@/payload-types'

export function ManagerDresses() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [docs, setDocs] = useState<Dress[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ depth: '1', limit: '20', page: String(page), draft: 'true', locale: 'en', sort: '-updatedAt' })
        if (search.trim()) {
          params.set('where[or][0][name][contains]', search.trim())
          params.set('where[or][1][sku][contains]', search.trim())
        }
        const response = await fetch('/api/dresses?' + params, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Unable to load dresses.')
        const data = await response.json()
        if (!controller.signal.aborted) {
          setDocs(data.docs)
          setTotalPages(data.totalPages)
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load dresses.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 200)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [search, page])
  return <main className="manager-section">
    <h1>Dress catalogue</h1>
    <Link className="manager-action" href="/manager/dresses/categories">Manage categories</Link>
    <Link className="manager-action" href="/manager/dresses/lookups">Manage catalogue attributes</Link>
    <Link className="manager-primary" href="/manager/dresses/new">+ New dress</Link>
    <label className="manager-search">Search dresses<input value={search} type="search" placeholder="Name or SKU" onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
    {loading ? <p role="status">Loading dresses…</p> : error ? <p role="alert">{error}</p> : <>
      <div className="manager-dresses-grid">{docs.map(dress => <Link className="manager-panel manager-dress-card" key={dress.id} href={'/manager/dresses/' + encodeURIComponent(dress.id)}>
        <strong>{dress.name}</strong><small>{dress.sku} · {dress._status ?? 'draft'}</small>
        <span>Sale: {dress.saleStatus} {dress.salePrice != null && '· €' + dress.salePrice}</span>
        <span>Rental: {dress.rentalStatus} {dress.rentalPrice != null && '· €' + dress.rentalPrice}</span>
        <small>{dress.publicVisibility}</small>
      </Link>)}</div>
      {!docs.length && <p>No dresses found.</p>}
      <div className="manager-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>{page} / {Math.max(totalPages, 1)}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button></div>
    </>}
  </main>
}
