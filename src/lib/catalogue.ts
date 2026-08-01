export type DressMode = 'buy' | 'rent'
export type CatalogueMode = DressMode
export type DressDisplayMode = 'all' | CatalogueMode
export type CatalogueSearchParams = Record<string, string | string[] | undefined>

export const catalogueSortOptions = [
  { label: 'Featured', value: 'featured' },
  { label: 'Curated order', value: 'curated' },
  { label: 'Newest', value: 'newest' },
  { label: 'Price: low to high', value: 'price-asc' },
  { label: 'Price: high to low', value: 'price-desc' },
] as const

export type CatalogueSort = (typeof catalogueSortOptions)[number]['value']

export const DEFAULT_CATALOGUE_SORT: CatalogueSort = 'featured'

export const CATALOGUE_PAGE_SIZE = 24

export type CataloguePageState = {
  page: number
  shouldRedirect: boolean
}

export type CatalogueSortState = {
  shouldRedirect: boolean
  sort: CatalogueSort
}

export function parseCatalogueSort(sort: string | string[] | undefined): CatalogueSortState {
  const requestedSort = Array.isArray(sort) ? sort[0] : sort
  const matchedSort = catalogueSortOptions.find((option) => option.value === requestedSort)?.value

  if (matchedSort === undefined) {
    return {
      shouldRedirect: requestedSort !== undefined,
      sort: DEFAULT_CATALOGUE_SORT,
    }
  }

  return {
    shouldRedirect: Array.isArray(sort) || matchedSort === DEFAULT_CATALOGUE_SORT,
    sort: matchedSort,
  }
}

export function normalizeCatalogueSortSearchParams(
  searchParams: CatalogueSearchParams,
  sort: CatalogueSort,
): CatalogueSearchParams {
  return {
    ...searchParams,
    sort: sort === DEFAULT_CATALOGUE_SORT ? undefined : sort,
  }
}

export function getCatalogueDressSort(mode: CatalogueMode, sort: CatalogueSort): string[] {
  const stableSort = ['displayOrder', '-createdAt', 'id']

  switch (sort) {
    case 'curated':
      return stableSort
    case 'newest':
      return ['-createdAt', 'id']
    case 'price-asc':
      return [mode === 'buy' ? 'salePrice' : 'rentalPrice', ...stableSort]
    case 'price-desc':
      return [mode === 'buy' ? '-salePrice' : '-rentalPrice', ...stableSort]
    case 'featured':
    default:
      return ['-featured', ...stableSort]
  }
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
