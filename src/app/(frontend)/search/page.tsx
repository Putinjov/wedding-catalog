import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { CardPostData } from '@/components/Card'
import { DressGrid } from '@/components/boutique/dress-grid'
import { searchPublicDresses } from '@/lib/searchDresses'

type Args = {
  searchParams: Promise<{
    q?: string | string[]
  }>
}
export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q } = await searchParamsPromise
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 120) ?? ''
  const payload = await getPayload({ config: configPromise })

  const [posts, dresses] = await Promise.all([
    payload.find({
      collection: 'search',
      depth: 1,
      limit: 12,
      overrideAccess: false,
      select: {
        title: true,
        slug: true,
        categories: true,
        meta: true,
      },
      // pagination: false reduces overhead if you don't need totalDocs
      pagination: false,
      ...(query
        ? {
            where: {
              or: [
                { title: { like: query } },
                { 'meta.description': { like: query } },
                { 'meta.title': { like: query } },
                { slug: { like: query } },
              ],
            },
          }
        : {}),
    }),
    searchPublicDresses(query),
  ])

  const hasResults = posts.totalDocs > 0 || dresses.length > 0

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none text-center">
          <h1 className="mb-8 lg:mb-16">Search</h1>

          <div className="max-w-[50rem] mx-auto">
            <Search />
          </div>
        </div>
      </div>

      {dresses.length > 0 ? (
        <section aria-labelledby="dress-search-results" className="container mb-16">
          <h2 className="mb-8 font-serif text-4xl text-foreground" id="dress-search-results">
            Wedding dresses
          </h2>
          <DressGrid dresses={dresses} />
        </section>
      ) : null}

      {posts.totalDocs > 0 ? (
        <section aria-labelledby="journal-search-results">
          <h2 className="sr-only" id="journal-search-results">
            Journal articles
          </h2>
          <CollectionArchive posts={posts.docs as CardPostData[]} />
        </section>
      ) : null}

      {!hasResults ? <div className="container">No results found.</div> : null}
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Payload Website Template Search`,
  }
}
