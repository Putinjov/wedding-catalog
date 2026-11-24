import type { Metadata } from 'next/types'

import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { DressGrid } from '@/components/boutique/dress-grid'
import { publicNoIndexRobots } from '@/config/indexation'
import { searchPublicDresses } from '@/lib/searchDresses'

type Args = {
  searchParams: Promise<{
    q?: string | string[]
  }>
}
export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q } = await searchParamsPromise
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 120) ?? ''
  const dresses = await searchPublicDresses(query)

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none text-center">
          <h1 className="mb-8 lg:mb-16">Search</h1>

          <div className="max-w-[50rem] mx-auto">
            <Search key={query} query={query} />
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

      {dresses.length === 0 ? <div className="container">No results found.</div> : null}
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    alternates: {
      canonical: '/search',
    },
    robots: publicNoIndexRobots,
    title: `Search wedding dresses`,
  }
}
