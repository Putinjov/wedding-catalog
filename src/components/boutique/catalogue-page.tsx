import type { CatalogueMode } from '@/lib/catalogue'
import {
  CATALOGUE_PAGE_SIZE,
  catalogueContent,
  getCataloguePageURL,
  getOutOfRangeCataloguePage,
  normalizeCatalogueSortSearchParams,
  parseCataloguePage,
  parseCatalogueSort,
  type CatalogueSearchParams,
} from '@/lib/catalogue'
import { parseCatalogueFilters } from '@/lib/catalogue-filters'
import { getCatalogueFilterOptions } from '@/lib/getCatalogueFilterOptions'
import { getDresses } from '@/lib/getDresses'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PageRange } from '@/components/PageRange'
import { CatalogueFilters } from './catalogue-filters'
import { CataloguePagination } from './catalogue-pagination'
import { CatalogueSortControl } from './catalogue-sort'
import { DressGrid } from './dress-grid'

export async function CataloguePage({
  mode,
  searchParams,
}: {
  mode: CatalogueMode
  searchParams: CatalogueSearchParams
}) {
  const requestedPage = parseCataloguePage(searchParams.page)
  const requestedSort = parseCatalogueSort(searchParams.sort)
  const filterOptions = await getCatalogueFilterOptions()
  const requestedFilters = parseCatalogueFilters(searchParams, filterOptions)
  const normalizedSearchParams = normalizeCatalogueSortSearchParams(
    requestedFilters.searchParams,
    requestedSort.sort,
  )

  if (
    requestedPage.shouldRedirect ||
    requestedSort.shouldRedirect ||
    requestedFilters.shouldRedirect
  ) {
    redirect(
      getCataloguePageURL({
        mode,
        page: requestedPage.page,
        searchParams: normalizedSearchParams,
      }),
    )
  }

  const dresses = await getDresses(mode, {
    filterOptions,
    filters: requestedFilters.filters,
    page: requestedPage.page,
    sort: requestedSort.sort,
  })
  const outOfRangePage = getOutOfRangeCataloguePage(requestedPage.page, dresses.totalPages)

  if (outOfRangePage !== null) {
    redirect(
      getCataloguePageURL({
        mode,
        page: outOfRangePage,
        searchParams: normalizedSearchParams,
      }),
    )
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

        <div className="mt-14 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <PageRange
            className="text-sm text-muted-foreground"
            collectionLabels={{ plural: 'dresses', singular: 'dress' }}
            currentPage={currentPage}
            limit={CATALOGUE_PAGE_SIZE}
            totalDocs={dresses.totalDocs}
          />
          <CatalogueSortControl
            mode={mode}
            searchParams={normalizedSearchParams}
            sort={requestedSort.sort}
          />
        </div>

        <div className="mt-6 scroll-mt-8" id="catalogue-results">
          <CatalogueFilters
            activeCount={requestedFilters.activeCount}
            filters={requestedFilters.filters}
            mode={mode}
            options={filterOptions}
            searchParams={normalizedSearchParams}
          >
            {dresses.docs.length > 0 ? (
              <>
                <DressGrid dresses={dresses.docs} mode={mode} />
                <CataloguePagination
                  mode={mode}
                  page={currentPage}
                  searchParams={normalizedSearchParams}
                  totalPages={dresses.totalPages}
                />
              </>
            ) : requestedFilters.activeCount > 0 ? (
              <div className="border border-border bg-secondary/45 px-6 py-10 text-muted-foreground">
                <p>No dresses match these filters. Try removing one or clear all filters.</p>
                <Link
                  className="mt-4 inline-flex min-h-11 items-center font-medium text-brand-deep-lavender underline underline-offset-4"
                  href={getCataloguePageURL({
                    mode,
                    page: 1,
                    searchParams: { sort: normalizedSearchParams.sort },
                  })}
                >
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="border border-border bg-secondary/45 px-6 py-10 text-muted-foreground">
                This collection will appear here once dresses have been published and made available.
              </div>
            )}
          </CatalogueFilters>
        </div>
      </section>
    </main>
  )
}
