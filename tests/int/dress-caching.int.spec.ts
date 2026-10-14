import { beforeEach, describe, expect, it, vi } from 'vitest'

import { revalidateDress, revalidateDressDelete } from '@/collections/Dresses/hooks/revalidateDress'
import {
  revalidateCatalogueLookup,
  revalidateCatalogueMedia,
} from '@/collections/hooks/revalidateCatalogue'
import { Backs } from '@/collections/Lookups/Backs'
import { Embellishments } from '@/collections/Lookups/Embellishments'
import { Necklines } from '@/collections/Lookups/Necklines'
import { Sleeves } from '@/collections/Lookups/Sleeves'
import { Trains } from '@/collections/Lookups/Trains'
import { Waistlines } from '@/collections/Lookups/Waistlines'
import { getDressSlugCacheTag, getRelatedDressCacheTag } from '@/lib/dress-cache'
import { getAvailableDressBySlug, getDressBySlug, getRelatedDresses } from '@/lib/getDress'
import type { Dress } from '@/payload-types'

const mocks = vi.hoisted(() => ({
  draft: false,
  entries: new Map<string, { tags: string[]; value: unknown }>(),
  find: vi.fn(),
  requestEntries: new Map<symbol, Map<string, unknown>>(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(async () => ({ find: mocks.find })),
}))
vi.mock('next/headers', () => ({
  draftMode: vi.fn(async () => ({ isEnabled: mocks.draft })),
}))
vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: (tag: string, profile: string | { expire: number }) => {
    mocks.revalidateTag(tag, profile)
    if (typeof profile !== 'object' || profile.expire !== 0) return
    for (const [key, entry] of mocks.entries) {
      if (entry.tags.includes(tag)) mocks.entries.delete(key)
    }
  },
  unstable_cache:
    <Arguments extends unknown[], Result>(
      callback: (...args: Arguments) => Promise<Result>,
      keyParts: string[],
      options: { tags?: string[] },
    ) =>
    async (...args: Arguments): Promise<Result> => {
      const key = JSON.stringify([keyParts, args])
      const entry = mocks.entries.get(key)
      if (entry) return entry.value as Result
      const value = await callback(...args)
      mocks.entries.set(key, { tags: options.tags ?? [], value })
      return value
    },
}))
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  // Model request boundaries separately from the persistent cache; only primitive args
  // are used by the production functions, matching React.cache argument identity.
  cache: <Arguments extends unknown[], Result>(callback: (...args: Arguments) => Result) => {
    const id = Symbol('request memo')
    return (...args: Arguments): Result => {
      const entries = mocks.requestEntries.get(id) ?? new Map<string, unknown>()
      mocks.requestEntries.set(id, entries)
      const key = JSON.stringify(args)
      if (entries.has(key)) return entries.get(key) as Result
      const value = callback(...args)
      entries.set(key, value)
      return value
    }
  },
}))
vi.mock('@/lib/dress-media', () => ({
  attachDressMedia: vi.fn(async (dresses: Dress[]) =>
    dresses.map((dress) => ({ ...dress, media: { gallery: [], main: null } })),
  ),
}))

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
    rentalStatus: 'available',
    rentalPrice: 500,
    saleStatus: 'available',
    salePrice: 1500,
    sku: 'INTERNAL-1',
    slug: 'grace',
    updatedAt: '2026-09-05T12:00:00.000Z',
    _status: 'published',
    ...overrides,
  }
}

function nextRequest() {
  mocks.requestEntries.clear()
}

async function changeDress(doc: Dress, previousDoc = dress()) {
  await revalidateDress({ doc, previousDoc, req: { context: {} } } as Parameters<
    typeof revalidateDress
  >[0])
  nextRequest()
}

beforeEach(() => {
  mocks.draft = false
  mocks.entries.clear()
  nextRequest()
  mocks.find.mockReset().mockResolvedValue({ docs: [dress()] })
  mocks.revalidatePath.mockReset()
  mocks.revalidateTag.mockReset()
})

describe('dress detail caching', () => {
  it('shares pending metadata/page reads within a request and persists successful results across requests', async () => {
    const [metadataDress, pageDress] = await Promise.all([
      getDressBySlug('grace'),
      getDressBySlug('grace'),
    ])
    expect(metadataDress).toBe(pageDress)
    expect(mocks.find).toHaveBeenCalledOnce()
    nextRequest()
    await getDressBySlug('grace')
    expect(mocks.find).toHaveBeenCalledOnce()
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({ draft: false, overrideAccess: false }),
    )
  })

  it('memoizes a missing result only within a request, allowing a newly published dress on the next request', async () => {
    mocks.find.mockResolvedValue({ docs: [] })
    await expect(getDressBySlug('new-dress')).resolves.toBeNull()
    await expect(getDressBySlug('new-dress')).resolves.toBeNull()
    expect(mocks.find).toHaveBeenCalledOnce()
    expect(mocks.entries.size).toBe(0)
    nextRequest()
    mocks.find.mockResolvedValue({ docs: [dress({ slug: 'new-dress' })] })
    await expect(getDressBySlug('new-dress')).resolves.toMatchObject({ slug: 'new-dress' })
    expect(mocks.find).toHaveBeenCalledTimes(2)
  })

  it.each(['hidden', 'archived'] as const)(
    'does not keep a public cached copy after becoming %s',
    async (publicVisibility) => {
      await getDressBySlug('grace')
      mocks.find.mockResolvedValue({ docs: [] })
      await changeDress(dress({ publicVisibility }))
      await expect(getDressBySlug('grace')).resolves.toBeNull()
      expect(mocks.entries.size).toBe(0)
    },
  )

  it('expires both slug tags and the populated redirect snapshot after renaming', async () => {
    await getDressBySlug('grace')
    await changeDress(dress({ slug: 'new-grace' }))
    expect(mocks.revalidateTag).toHaveBeenCalledWith(getDressSlugCacheTag('grace'), { expire: 0 })
    expect(mocks.revalidateTag).toHaveBeenCalledWith(getDressSlugCacheTag('new-grace'), {
      expire: 0,
    })
    expect(mocks.revalidateTag).toHaveBeenCalledWith('redirects', { expire: 0 })
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dresses/grace')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dresses/new-grace')
    mocks.find
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [dress({ slug: 'new-grace' })] })
    await expect(getDressBySlug('grace')).resolves.toBeNull()
    await expect(getDressBySlug('new-grace')).resolves.toMatchObject({ slug: 'new-grace' })
  })

  it('keeps a sold dress public with its current independent rental availability', async () => {
    await getDressBySlug('grace')
    const sold = dress({ saleStatus: 'sold' })
    mocks.find.mockResolvedValue({ docs: [sold] })
    await changeDress(sold)
    await expect(getDressBySlug('grace')).resolves.toMatchObject({
      saleStatus: 'sold',
      rentalStatus: 'available',
    })
  })

  it('expires detail data after unpublish and delete', async () => {
    await getDressBySlug('grace')
    mocks.find.mockResolvedValue({ docs: [] })
    await changeDress(dress({ _status: 'draft' }))
    await expect(getDressBySlug('grace')).resolves.toBeNull()
    await revalidateDressDelete({ doc: dress(), req: { context: {} } } as Parameters<
      typeof revalidateDressDelete
    >[0])
    expect(mocks.revalidateTag).toHaveBeenCalledWith(getDressSlugCacheTag('grace'), { expire: 0 })
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dresses/grace')
  })

  it('bypasses persistent reads and writes in Draft Mode while retaining public access rules', async () => {
    await getDressBySlug('grace')
    const publicEntry = [...mocks.entries.values()][0]
    nextRequest()
    mocks.draft = true
    mocks.find.mockResolvedValue({ docs: [dress({ name: 'Fresh public title' })] })
    await expect(getDressBySlug('grace')).resolves.toMatchObject({ name: 'Fresh public title' })
    expect([...mocks.entries.values()][0]).toBe(publicEntry)
    nextRequest()
    await getDressBySlug('grace')
    expect(mocks.find).toHaveBeenCalledTimes(3)
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({ draft: false, overrideAccess: false }),
    )
  })

  it('propagates database failures without persisting them as 404s', async () => {
    mocks.find.mockRejectedValue(new Error('Database unavailable'))
    await expect(getDressBySlug('grace')).rejects.toThrow('Database unavailable')
    expect(mocks.entries.size).toBe(0)
  })

  it('bounds tag lengths without aliasing Unicode or long slugs', () => {
    expect(getDressSlugCacheTag('a'.repeat(1000)).length).toBeLessThanOrEqual(256)
    expect(getDressSlugCacheTag('сукня')).not.toBe(getDressSlugCacheTag('dress'))
    expect(getRelatedDressCacheTag('id', 'buy')).not.toBe(getRelatedDressCacheTag('id', 'rent'))
  })
})

describe('booking freshness', () => {
  it('reads current Payload data for both undecided and mode-specific booking checks even when detail is warm', async () => {
    await getDressBySlug('grace')
    mocks.find.mockResolvedValue({ docs: [] })
    await expect(getDressBySlug('grace', { fresh: true })).resolves.toBeNull()
    await expect(getAvailableDressBySlug('grace', 'buy')).resolves.toBeNull()
    await expect(getAvailableDressBySlug('grace', 'rent')).resolves.toBeNull()
    expect(mocks.find).toHaveBeenCalledTimes(4)
    expect(mocks.entries.size).toBe(1)
  })
})

describe('related dress caching', () => {
  it('shares a request and persists separately by source dress and mode', async () => {
    const reference = dress()
    await Promise.all([
      getRelatedDresses({ dress: reference, mode: 'buy' }),
      getRelatedDresses({ dress: reference, mode: 'buy' }),
    ])
    nextRequest()
    await getRelatedDresses({ dress: reference, mode: 'buy' })
    expect(mocks.find).toHaveBeenCalledOnce()
    await getRelatedDresses({ dress: reference, mode: 'rent' })
    await getRelatedDresses({ dress: dress({ id: 'another' }), mode: 'buy' })
    expect(mocks.find).toHaveBeenCalledTimes(4)
  })

  it('refreshes candidates after another dress changes availability', async () => {
    const candidate = dress({ id: 'candidate', slug: 'candidate' })
    mocks.find.mockResolvedValue({ docs: [candidate] })
    await expect(getRelatedDresses({ dress: dress(), mode: 'buy' })).resolves.toHaveLength(1)
    mocks.find.mockResolvedValue({ docs: [] })
    await changeDress({ ...candidate, saleStatus: 'sold' }, candidate)
    await expect(getRelatedDresses({ dress: dress(), mode: 'buy' })).resolves.toEqual([])
    expect(mocks.find).toHaveBeenCalledTimes(3)
  })

  it('includes authoritative ranking attributes in the key', async () => {
    await getRelatedDresses({ dress: dress(), mode: 'buy' })
    nextRequest()
    await getRelatedDresses({ dress: dress({ salePrice: 2000 }), mode: 'buy' })
    expect(mocks.find).toHaveBeenCalledTimes(2)
  })

  it('bypasses persistent caching for related results in Draft Mode', async () => {
    mocks.draft = true
    await getRelatedDresses({ dress: dress(), mode: 'buy' })
    nextRequest()
    await getRelatedDresses({ dress: dress(), mode: 'buy' })
    expect(mocks.find).toHaveBeenCalledTimes(2)
    expect(mocks.entries.size).toBe(0)
  })

  it.each([revalidateCatalogueLookup, revalidateCatalogueMedia])(
    'refreshes detail and related results after populated content changes',
    async (hook) => {
      await getDressBySlug('grace')
      await getRelatedDresses({ dress: dress(), mode: 'buy' })
      await hook({ doc: { id: 'lookup-or-media' }, req: { context: {} } } as Parameters<
        typeof hook
      >[0])
      nextRequest()
      await getDressBySlug('grace')
      await getRelatedDresses({ dress: dress(), mode: 'buy' })
      expect(mocks.find).toHaveBeenCalledTimes(4)
    },
  )

  it('covers every additional attribute rendered by DressDetails', () => {
    for (const collection of [Backs, Embellishments, Necklines, Sleeves, Trains, Waistlines]) {
      expect(collection.hooks?.afterChange).toContain(revalidateCatalogueLookup)
    }
  })
})
