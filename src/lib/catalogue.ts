export type DressMode = 'buy' | 'rent'
export type CatalogueMode = DressMode
export type DressDisplayMode = 'all' | CatalogueMode
export type CatalogueSearchParams = Record<string, string | string[] | undefined>

export const CATALOGUE_PAGE_SIZE = 24

export type CataloguePageState = {
  page: number
  shouldRedirect: boolean
}

export function parseCataloguePage(page: string | string[] | undefined): CataloguePageState {
  const requestedPage = Array.isArray(page) ? page[0] : page

  if (requestedPage === undefined) {
    return { page: 1, shouldRedirect: false }
  }

  if (!/^[1-9]\d*$/.test(requestedPage)) {
    return { page: 1, shouldRedirect: true }
  }

  const parsedPage = Number(requestedPage)
  if (!Number.isSafeInteger(parsedPage)) {
    return { page: 1, shouldRedirect: true }
  }

  return {
    page: parsedPage,
    shouldRedirect: Array.isArray(page) || parsedPage === 1,
  }
}

export function getOutOfRangeCataloguePage(page: number, totalPages: number): number | null {
  const lastPage = Math.max(totalPages, 1)
  return page > lastPage ? lastPage : null
}

export function getCataloguePageURL({
  mode,
  page,
  searchParams,
  includeResultsAnchor = false,
}: {
  includeResultsAnchor?: boolean
  mode: CatalogueMode
  page: number
  searchParams: CatalogueSearchParams
}): string {
  const params = new URLSearchParams()

  for (const [name, value] of Object.entries(searchParams)) {
    if (name === 'page' || value === undefined) continue

    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(name, item)
    }
  }

  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  const anchor = includeResultsAnchor ? '#catalogue-results' : ''
  return `/${mode}${query ? `?${query}` : ''}${anchor}`
}

export function getRequestedDressMode(
  mode: string | string[] | undefined,
): DressMode | null {
  const requestedMode = Array.isArray(mode) ? mode[0] : mode
  return requestedMode === 'buy' || requestedMode === 'rent' ? requestedMode : null
}

export const catalogueContent: Record<
  CatalogueMode,
  {
    eyebrow: string
    title: string
    description: string
  }
> = {
  buy: {
    eyebrow: 'Buy wedding dresses',
    title: 'Find the one to keep',
    description: 'Explore new and selected wedding dresses available to purchase.',
  },
  rent: {
    eyebrow: 'Rent wedding dresses',
    title: 'Wear the dream for less',
    description: 'Choose a beautiful gown for your day without the full purchase price.',
  },
}
