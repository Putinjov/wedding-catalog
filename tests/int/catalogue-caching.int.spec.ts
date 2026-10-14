import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Categories } from '@/collections/Categories'
import { revalidateDress, revalidateDressDelete } from '@/collections/Dresses/hooks/revalidateDress'
import { Colors } from '@/collections/Lookups/Colors'
import { Sizes } from '@/collections/Lookups/Sizes'
import { Media } from '@/collections/Media'
import {
  revalidateCatalogueLookup,
  revalidateCatalogueLookupDelete,
  revalidateCatalogueMedia,
  revalidateCatalogueMediaDelete,
} from '@/collections/hooks/revalidateCatalogue'
import {
  parseCatalogueFilters,
  type CatalogueFilterOptions,
  type CatalogueFilterValues,
} from '@/lib/catalogue-filters'
import {
  CATALOGUE_FILTER_OPTIONS_CACHE_TAG,
  DRESSES_CACHE_TAG,
  getCatalogueModeCacheTag,
} from '@/lib/dress-cache'
import { getCatalogueFilterOptions } from '@/lib/getCatalogueFilterOptions'
import { getDresses, MAX_CACHED_CATALOGUE_PAGE } from '@/lib/getDresses'
import type { Dress } from '@/payload-types'

const mocks = vi.hoisted(() => ({
  cacheEntries: new Map<string, unknown>(),
  cacheTags: new Map<string, Set<string>>(),
  find: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstableCache: vi.fn(),
}))

vi.mock('@payload-config', () => ({
  default: Promise.resolve({}),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: (tag: string, profile: string | { expire: number }) => {
    mocks.revalidateTag(tag, profile)

    // Only immediate expiration permits a blocking fresh read on the next request.
    if (typeof profile === 'object' && profile.expire === 0) {
      for (const key of mocks.cacheTags.get(tag) ?? []) mocks.cacheEntries.delete(key)
    }
  },
  unstable_cache: <Arguments extends unknown[], Result>(
    callback: (...args: Arguments) => Promise<Result>,
    keyParts: string[],
    options?: { tags?: string[] },
  ) => {
    mocks.unstableCache(keyParts)

    return async (...args: Arguments): Promise<Result> => {
      const key = JSON.stringify([keyParts, args])

      if (mocks.cacheEntries.has(key)) {
        return mocks.cacheEntries.get(key) as Result
      }

      const value = await callback(...args)
      mocks.cacheEntries.set(key, value)

      for (const tag of options?.tags ?? []) {
        const taggedKeys = mocks.cacheTags.get(tag) ?? new Set<string>()
        taggedKeys.add(key)
        mocks.cacheTags.set(tag, taggedKeys)
      }

      return value
    }
  },
}))

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()

  return {
    ...actual,
    getPayload: vi.fn(async () => ({ find: mocks.find })),
  }
})

vi.mock('@/lib/dress-media', () => ({
  attachDressMedia: vi.fn(async () => []),
}))

const filterOptions: CatalogueFilterOptions = {
  categories: [],
  colours: [],
  designers: [
    { id: 'designer-a', label: 'A', slug: 'a' },
    { id: 'designer-b', label: 'B', slug: 'b' },
  ],
  fabrics: [],
  silhouettes: [],
}

function filters(overrides: Partial<CatalogueFilterValues> = {}): CatalogueFilterValues {
  return {
    category: [],
    colour: [],
    designer: [],
    fabric: [],
    featured: false,
    priceMax: null,
    priceMin: null,
    silhouette: [],
    ...overrides,
  }
}

function dress(overrides: Partial<Dress> = {}): Dress {
  return {
    id: 'dress-1',
    category: 'category-1',
    condition: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    displayOrder: 0,
    mainImage: 'media-1',
    name: 'Grace',
    publicVisibility: 'public',
    rentalStatus: 'not-for-rent',
    saleStatus: 'available',
    sku: 'GRACE-1',
    slug: 'grace',
    updatedAt: '2026-09-05T12:00:00.000Z',
    _status: 'published',
    ...overrides,
  }
}

describe('catalogue persistent caching', () => {
  beforeEach(() => {
    mocks.cacheEntries.clear()
    mocks.cacheTags.clear()
    mocks.find.mockReset()
    mocks.find.mockResolvedValue({ docs: [], totalDocs: 0, totalPages: 0 })
    mocks.revalidatePath.mockReset()
    mocks.revalidateTag.mockReset()
  })

  it('reuses a cached Payload result for the same normalized catalogue query', async () => {
    await getDresses('buy')
    await getDresses('buy')

    expect(mocks.find).toHaveBeenCalledOnce()
  })

  it('keeps Buy and Rent cache entries separate', async () => {
    await getDresses('buy')
    await getDresses('rent')

    expect(mocks.find).toHaveBeenCalledTimes(2)
  })

  it('canonicalizes relationship conditions before they reach the cache key', async () => {
    await getDresses('buy', {
      filterOptions,
      filters: filters({ designer: ['b', 'a'] }),
    })
    await getDresses('buy', {
      filterOptions,
      filters: filters({ designer: ['a', 'b'] }),
    })

    expect(mocks.find).toHaveBeenCalledOnce()
  })

  it('bypasses persistent cache for unbounded price, page, and draft variants', async () => {
    const priceFilters = filters({ priceMin: 1234.56 })

    await getDresses('buy', { filterOptions, filters: priceFilters })
    await getDresses('buy', { filterOptions, filters: priceFilters })
    await getDresses('buy', { page: MAX_CACHED_CATALOGUE_PAGE + 1 })
    await getDresses('buy', { page: MAX_CACHED_CATALOGUE_PAGE + 1 })
    await getDresses('buy', { draft: true })
    await getDresses('buy', { draft: true })

    expect(mocks.find).toHaveBeenCalledTimes(6)
    expect(mocks.cacheEntries.size).toBe(0)
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({ draft: false, overrideAccess: false }),
    )
  })

  it('excludes unknown parameters and invalid lookup slugs from cache keys', async () => {
    for (let index = 0; index < 20; index++) {
      const parsed = parseCatalogueFilters(
        { designer: ['a', `unknown-${index}`], utm_source: `campaign-${index}` },
        filterOptions,
      )
      await getDresses('buy', { filterOptions, filters: parsed.filters })
    }
    expect(mocks.find).toHaveBeenCalledOnce()
    expect(mocks.cacheEntries.size).toBe(1)
  })

  it('keeps different pages, sorts, and featured selections distinct', async () => {
    await getDresses('buy')
    await getDresses('buy', { page: 2 })
    await getDresses('buy', { sort: 'newest' })
    await getDresses('buy', { filterOptions, filters: filters({ featured: true }) })
    expect(mocks.find).toHaveBeenCalledTimes(4)
  })

  it('reuses cached public filter options and bypasses them in draft mode', async () => {
    await getCatalogueFilterOptions()
    await getCatalogueFilterOptions()
    expect(mocks.find).toHaveBeenCalledTimes(5)

    await getCatalogueFilterOptions({ draft: true })
    await getCatalogueFilterOptions({ draft: true })
    expect(mocks.find).toHaveBeenCalledTimes(15)
  })
})

describe('catalogue cache invalidation', () => {
  beforeEach(() => {
    mocks.cacheEntries.clear()
    mocks.cacheTags.clear()
    mocks.find.mockReset()
    mocks.find.mockResolvedValue({ docs: [], totalDocs: 0, totalPages: 0 })
    mocks.revalidatePath.mockReset()
    mocks.revalidateTag.mockReset()
  })

  it('invalidates global and mode catalogue tags after a published dress change', async () => {
    const published = dress()

    await revalidateDress({
      doc: published,
      previousDoc: published,
      req: { context: {} },
    } as Parameters<typeof revalidateDress>[0])

    expect(mocks.revalidateTag).toHaveBeenCalledWith(DRESSES_CACHE_TAG, { expire: 0 })
    expect(mocks.revalidateTag).toHaveBeenCalledWith(getCatalogueModeCacheTag('buy'), { expire: 0 })
    expect(mocks.revalidateTag).toHaveBeenCalledWith(getCatalogueModeCacheTag('rent'), {
      expire: 0,
    })
  })

  it.each([
    { saleStatus: 'sold' as const },
    { rentalStatus: 'cleaning' as const },
    { publicVisibility: 'hidden' as const },
    { _status: 'draft' as const },
  ])(
    'loads fresh catalogue content after $saleStatus$publicVisibility$_status$rentalStatus',
    async (change) => {
      const published = dress()

      await getDresses('buy')
      await getDresses('buy')
      expect(mocks.find).toHaveBeenCalledOnce()

      await revalidateDress({
        doc: dress(change),
        previousDoc: published,
        req: { context: {} },
      } as Parameters<typeof revalidateDress>[0])
      await getDresses('buy')

      expect(mocks.find).toHaveBeenCalledTimes(2)
    },
  )

  it('invalidates public catalogue caches after deleting a published dress', async () => {
    await revalidateDressDelete({
      doc: dress(),
      req: { context: {} },
    } as Parameters<typeof revalidateDressDelete>[0])

    expect(mocks.revalidateTag).toHaveBeenCalledWith(DRESSES_CACHE_TAG, { expire: 0 })
  })

  it('invalidates filter options and dress results after lookup changes and deletes', async () => {
    const args = {
      doc: { id: 'designer-a' },
      req: { context: {} },
    }

    await revalidateCatalogueLookup(args as Parameters<typeof revalidateCatalogueLookup>[0])
    await revalidateCatalogueLookupDelete(
      args as Parameters<typeof revalidateCatalogueLookupDelete>[0],
    )

    expect(mocks.revalidateTag).toHaveBeenCalledWith(CATALOGUE_FILTER_OPTIONS_CACHE_TAG, {
      expire: 0,
    })
    expect(mocks.revalidateTag).toHaveBeenCalledWith(DRESSES_CACHE_TAG, { expire: 0 })
  })

  it('refreshes cached images after media updates and deletes', async () => {
    expect(Media.hooks?.afterChange).toContain(revalidateCatalogueMedia)
    expect(Media.hooks?.afterDelete).toContain(revalidateCatalogueMediaDelete)
    await getDresses('buy')
    await revalidateCatalogueMedia({ doc: { id: 'media-1' }, req: { context: {} } } as Parameters<
      typeof revalidateCatalogueMedia
    >[0])
    await getDresses('buy')
    await revalidateCatalogueMediaDelete({
      doc: { id: 'media-1' },
      req: { context: {} },
    } as Parameters<typeof revalidateCatalogueMediaDelete>[0])
    await getDresses('buy')
    expect(mocks.find).toHaveBeenCalledTimes(3)
  })

  it('attaches lookup invalidation only to public catalogue filters', () => {
    expect(Categories.hooks?.afterChange).toContain(revalidateCatalogueLookup)
    expect(Colors.hooks?.afterChange).toContain(revalidateCatalogueLookup)
    expect(Sizes.hooks?.afterChange).toBeUndefined()
  })

  it('honours explicit revalidation suppression', async () => {
    const context: Parameters<typeof revalidateCatalogueLookup>[0]['req']['context'] = {
      disableRevalidate: true,
    }
    await revalidateCatalogueLookup({
      doc: { id: 'designer-a' },
      req: { context },
    } as Parameters<typeof revalidateCatalogueLookup>[0])

    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })
})
