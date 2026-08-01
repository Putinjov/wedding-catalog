import type { CatalogueMode } from '@/lib/catalogue'
import {
  CATALOGUE_PAGE_SIZE,
  catalogueContent,
  getCataloguePageURL,
  getOutOfRangeCataloguePage,
  parseCataloguePage,
  type CatalogueSearchParams,
} from '@/lib/catalogue'
import { getDresses } from '@/lib/getDresses'
import { redirect } from 'next/navigation'

import { PageRange } from '@/components/PageRange'
import { CataloguePagination } from './catalogue-pagination'
import { DressGrid } from './dress-grid'

export async function CataloguePage({
  mode,
  searchParams,
}: {
  mode: CatalogueMode
  searchParams: CatalogueSearchParams
}) {
  const requestedPage = parseCataloguePage(searchParams.page)

  if (requestedPage.shouldRedirect) {
    redirect(getCataloguePageURL({ mode, page: requestedPage.page, searchParams }))
  }

  const dresses = await getDresses(mode, { page: requestedPage.page })
  const outOfRangePage = getOutOfRangeCataloguePage(requestedPage.page, dresses.totalPages)

  if (outOfRangePage !== null) {
    redirect(getCataloguePageURL({ mode, page: outOfRangePage, searchParams }))
  }

  const content = catalogueContent[mode]
  const currentPage = dresses.page ?? requestedPage.page

  return (
    <main className="bg-background">
      <section className="container py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl md:text-7xl">
            {content.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            {content.description}
          </p>
        </div>

        <div className="mt-14 scroll-mt-8" id="catalogue-results">
          {dresses.docs.length > 0 ? (
            <>
              <PageRange
                className="mb-6 text-sm text-muted-foreground"
                collectionLabels={{ plural: 'dresses', singular: 'dress' }}
                currentPage={currentPage}
                limit={CATALOGUE_PAGE_SIZE}
                totalDocs={dresses.totalDocs}
              />
              <DressGrid dresses={dresses.docs} mode={mode} />
              <CataloguePagination
                mode={mode}
                page={currentPage}
                searchParams={searchParams}
                totalPages={dresses.totalPages}
              />
            </>
          ) : (
            <div className="border border-border bg-secondary/45 px-6 py-10 text-muted-foreground">
              This collection will appear here once dresses have been published and made available.
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
