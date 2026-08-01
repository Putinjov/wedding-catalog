import type { DressMode } from '@/lib/catalogue'
import { catalogueSortOptions } from '@/lib/catalogue'
import { catalogueFilterParameterNames } from '@/lib/catalogue-filters'

const catalogueReturnParameterNames = new Set<string>([
  ...catalogueFilterParameterNames,
  'page',
  'sort',
])
const catalogueSortValues = new Set<string>(catalogueSortOptions.map(({ value }) => value))

export function getDressPath(slug: string): string {
  return `/dresses/${encodeURIComponent(slug)}`
}

export function appendDressMode(path: string, mode: DressMode | null): string {
  return mode ? `${path}?mode=${mode}` : path
}

export function getDressHref({
  mode,
  returnTo,
  slug,
  source,
}: {
  mode: DressMode | null
  returnTo?: string | null
  slug: string
  source?: 'related' | null
}): string {
  const params = new URLSearchParams()
  if (mode) params.set('mode', mode)
  if (returnTo) params.set('returnTo', returnTo)
  if (source) params.set('source', source)

  const query = params.toString()
  const path = getDressPath(slug)
  return query ? `${path}?${query}` : path
}

export function normalizeCatalogueReturnTo(
  value: string | string[] | undefined,
  expectedMode?: DressMode,
): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return null
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  if (/[\u0000-\u001F\u007F]/.test(value)) return null

  let url: URL
  try {
    url = new URL(value, 'https://catalogue.invalid')
  } catch {
    return null
  }

  if (url.origin !== 'https://catalogue.invalid') return null

  const mode = url.pathname === '/buy' ? 'buy' : url.pathname === '/rent' ? 'rent' : null
  if (!mode || (expectedMode && mode !== expectedMode)) return null
  if (url.hash && url.hash !== '#catalogue-results') return null
  if ([...url.searchParams].length > 50) return null

  for (const [name, parameterValue] of url.searchParams) {
    if (
      !catalogueReturnParameterNames.has(name) ||
      parameterValue.length === 0 ||
      parameterValue.length > 100
    ) {
      return null
    }
  }

  const page = url.searchParams.getAll('page')
  if (page.length > 1 || (page[0] && !/^[2-9]\d*$/.test(page[0]))) return null

  const sort = url.searchParams.getAll('sort')
  if (sort.length > 1 || (sort[0] && !catalogueSortValues.has(sort[0]))) return null

  return `${url.pathname}${url.search}${url.hash}`
}
