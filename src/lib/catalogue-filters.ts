import type { Where } from 'payload'

import type { CatalogueMode, CatalogueSearchParams } from '@/lib/catalogue'

export const catalogueFilterParameterNames = [
  'category',
  'colour',
  'designer',
  'fabric',
  'silhouette',
  'featured',
  'priceMin',
  'priceMax',
] as const

type RelationshipFilterName =
  | 'category'
  | 'colour'
  | 'designer'
  | 'fabric'
  | 'silhouette'

export type CatalogueFilterOption = {
  id: string
  label: string
  slug: string
}

export type CatalogueFilterOptions = {
  categories: CatalogueFilterOption[]
  colours: CatalogueFilterOption[]
  designers: CatalogueFilterOption[]
  fabrics: CatalogueFilterOption[]
  silhouettes: CatalogueFilterOption[]
}

export type CatalogueFilterValues = {
  category: string[]
  colour: string[]
  designer: string[]
  fabric: string[]
  featured: boolean
  priceMax: number | null
  priceMin: number | null
  silhouette: string[]
}

export type ParsedCatalogueFilters = {
  activeCount: number
  filters: CatalogueFilterValues
  searchParams: CatalogueSearchParams
  shouldRedirect: boolean
}

const relationshipFilterNames: RelationshipFilterName[] = [
  'category',
  'colour',
  'designer',
  'fabric',
  'silhouette',
]

const filterOptionKeys: Record<RelationshipFilterName, keyof CatalogueFilterOptions> = {
  category: 'categories',
  colour: 'colours',
  designer: 'designers',
  fabric: 'fabrics',
  silhouette: 'silhouettes',
}

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function arraysEqual(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index])
}

function normalizeRelationshipFilter(
  value: string | string[] | undefined,
  options: readonly CatalogueFilterOption[],
): { shouldRedirect: boolean; values: string[] } {
  const requested = asArray(value)
  const requestedSet = new Set(requested)
  const values = options.filter((option) => requestedSet.has(option.slug)).map((option) => option.slug)

  return {
    shouldRedirect: !arraysEqual(requested, values),
    values,
  }
}

function normalizePrice(value: string | string[] | undefined): {
  amount: number | null
  normalized: string | undefined
  shouldRedirect: boolean
} {
  if (value === undefined) {
    return { amount: null, normalized: undefined, shouldRedirect: false }
  }

  const requested = Array.isArray(value) ? value[0] : value
  if (requested === undefined || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(requested)) {
    return { amount: null, normalized: undefined, shouldRedirect: true }
  }

  const amount = Number(requested)
  if (!Number.isFinite(amount)) {
    return { amount: null, normalized: undefined, shouldRedirect: true }
  }

  const normalized = String(amount)
  return {
    amount,
    normalized,
    shouldRedirect: Array.isArray(value) || requested !== normalized,
  }
}

function normalizeFeatured(value: string | string[] | undefined): {
  featured: boolean
  shouldRedirect: boolean
} {
  if (value === undefined) return { featured: false, shouldRedirect: false }

  const requested = Array.isArray(value) ? value[0] : value
  if (requested === '1') {
    return { featured: true, shouldRedirect: Array.isArray(value) }
  }

  return { featured: false, shouldRedirect: true }
}

export function parseCatalogueFilters(
  searchParams: CatalogueSearchParams,
  options: CatalogueFilterOptions,
): ParsedCatalogueFilters {
  const relationshipValues = relationshipFilterNames.reduce(
    (result, name) => {
      const normalized = normalizeRelationshipFilter(searchParams[name], options[filterOptionKeys[name]])
      result.filters[name] = normalized.values
      result.shouldRedirect ||= normalized.shouldRedirect
      return result
    },
    {
      filters: {} as Record<RelationshipFilterName, string[]>,
      shouldRedirect: false,
    },
  )
  const featured = normalizeFeatured(searchParams.featured)
  const minimum = normalizePrice(searchParams.priceMin)
  const maximum = normalizePrice(searchParams.priceMax)
  let priceMin = minimum.amount
  let priceMax = maximum.amount
  let priceMinParam = minimum.normalized
  let priceMaxParam = maximum.normalized
  let shouldRedirect =
    relationshipValues.shouldRedirect ||
    featured.shouldRedirect ||
    minimum.shouldRedirect ||
    maximum.shouldRedirect

  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    const previousMinimum = priceMin
    const previousMinimumParam = priceMinParam
    priceMin = priceMax
    priceMinParam = priceMaxParam
    priceMax = previousMinimum
    priceMaxParam = previousMinimumParam
    shouldRedirect = true
  }

  const filters: CatalogueFilterValues = {
    ...relationshipValues.filters,
    featured: featured.featured,
    priceMax,
    priceMin,
  }
  const normalizedSearchParams: CatalogueSearchParams = {
    category: filters.category.length > 0 ? filters.category : undefined,
    colour: filters.colour.length > 0 ? filters.colour : undefined,
    designer: filters.designer.length > 0 ? filters.designer : undefined,
    fabric: filters.fabric.length > 0 ? filters.fabric : undefined,
    featured: filters.featured ? '1' : undefined,
    priceMax: priceMaxParam,
    priceMin: priceMinParam,
    silhouette: filters.silhouette.length > 0 ? filters.silhouette : undefined,
  }

  return {
    activeCount:
      relationshipFilterNames.reduce((count, name) => count + filters[name].length, 0) +
      Number(filters.featured) +
      Number(filters.priceMin !== null) +
      Number(filters.priceMax !== null),
    filters,
    searchParams: normalizedSearchParams,
    shouldRedirect,
  }
}

function getOptionIDs(
  slugs: readonly string[],
  options: readonly CatalogueFilterOption[],
): string[] {
  const selected = new Set(slugs)
  return options.filter((option) => selected.has(option.slug)).map((option) => option.id)
}

export function buildCatalogueFilterConditions(
  mode: CatalogueMode,
  filters: CatalogueFilterValues,
  options: CatalogueFilterOptions,
): Where[] {
  const conditions: Where[] = []
  const relationshipFields: Record<RelationshipFilterName, string> = {
    category: 'category',
    colour: 'colors',
    designer: 'designer',
    fabric: 'fabrics',
    silhouette: 'silhouette',
  }

  for (const name of relationshipFilterNames) {
    const ids = getOptionIDs(filters[name], options[filterOptionKeys[name]])
    if (ids.length > 0) conditions.push({ [relationshipFields[name]]: { in: ids } })
  }

  if (filters.featured) conditions.push({ featured: { equals: true } })

  if (filters.priceMin !== null || filters.priceMax !== null) {
    const priceCondition: Record<string, number> = {}
    if (filters.priceMin !== null) priceCondition.greater_than_equal = filters.priceMin
    if (filters.priceMax !== null) priceCondition.less_than_equal = filters.priceMax
    conditions.push({
      [mode === 'buy' ? 'salePrice' : 'rentalPrice']: priceCondition,
    })
  }

  return conditions
}

export function hasCatalogueFilterParameters(searchParams: CatalogueSearchParams): boolean {
  return catalogueFilterParameterNames.some((name) => searchParams[name] !== undefined)
}
