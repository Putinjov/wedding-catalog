import type { Where } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAvailableDressBySlug, getRelatedDresses } from '@/lib/getDress'
import { getDresses } from '@/lib/getDresses'
import { getFeaturedDresses } from '@/lib/getFeaturedDresses'
import { attachDressMedia } from '@/lib/dress-media'
import { CATALOGUE_PAGE_SIZE, getCatalogueDressSort } from '@/lib/catalogue'
import {
  buildCatalogueFilterConditions,
  parseCatalogueFilters,
  type CatalogueFilterOptions,
} from '@/lib/catalogue-filters'
import { buildPublicDressWhere } from '@/lib/public-dress-filters'
import { searchPublicDresses } from '@/lib/searchDresses'
import type { Dress } from '@/payload-types'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
}))

vi.mock('@payload-config', () => ({
  default: Promise.resolve({}),
}))

vi.mock('next/cache', () => ({
  unstable_cache: <Arguments extends unknown[], Result>(
    callback: (...args: Arguments) => Promise<Result>,
  ) => callback,
}))

vi.mock('next/headers', () => ({
  draftMode: vi.fn(async () => ({ isEnabled: false })),
}))

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()

  return {
    ...actual,
    getPayload: vi.fn(async () => ({
      find: mocks.find,
    })),
  }
})

vi.mock('@/lib/dress-media', () => ({
  attachDressMedia: vi.fn(async () => []),
}))

const saleStatuses: Dress['saleStatus'][] = [
  'not-for-sale',
  'available',
  'reserved',
  'sold',
]
const rentalStatuses: Dress['rentalStatus'][] = [
  'not-for-rent',
  'available',
  'reserved',
  'rented',
  'cleaning',
  'repair',
]
const publicVisibilities: Dress['publicVisibility'][] = ['public', 'hidden', 'archived']

const catalogueFilterOptions: CatalogueFilterOptions = {
  categories: [{ id: 'category-1', label: 'Bridal', slug: 'bridal' }],
  colours: [{ id: 'colour-1', label: 'Ivory', slug: 'ivory' }],
  designers: [{ id: 'designer-1', label: 'Designer', slug: 'designer' }],
  fabrics: [{ id: 'fabric-1', label: 'Lace', slug: 'lace' }],
  silhouettes: [{ id: 'silhouette-1', label: 'A-line', slug: 'a-line' }],
}

const statusCases = publicVisibilities.flatMap((publicVisibility) =>
  saleStatuses.flatMap((saleStatus) =>
    rentalStatuses.map((rentalStatus) => ({
      publicVisibility,
      rentalStatus,
      saleStatus,
    })),
  ),
)

type FilterRecord = (typeof statusCases)[number] & {
  _status: 'draft' | 'published'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function matchesWhere(where: Where, record: FilterRecord): boolean {
  if (where.and && !where.and.every((condition) => matchesWhere(condition, record))) {
    return false
  }

  if (where.or && !where.or.some((condition) => matchesWhere(condition, record))) {
    return false
  }

  return Object.entries(where)
    .filter(([field]) => field !== 'and' && field !== 'or')
    .every(([field, condition]) => {
      if (!isRecord(condition)) return false
      const value = record[field as keyof FilterRecord]

      if ('equals' in condition && value !== condition.equals) return false
      if ('not_equals' in condition && value === condition.not_equals) return false
      return true
    })
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
    rentalStatus: 'available',
    saleStatus: 'available',
    sku: 'GRACE-1',
    slug: 'grace',
    updatedAt: '2026-07-31T12:00:00.000Z',
    _status: 'published',
    ...overrides,
  }
}

describe('public dress filter builder', () => {
  it.each(statusCases)(
    'applies public, Buy, and Rent rules for $publicVisibility/$saleStatus/$rentalStatus',
    ({ publicVisibility, rentalStatus, saleStatus }) => {
      const record: FilterRecord = {
        _status: 'published',
        publicVisibility,
        rentalStatus,
        saleStatus,
      }

      expect(matchesWhere(buildPublicDressWhere(), record)).toBe(
        publicVisibility === 'public' &&
          (saleStatus !== 'not-for-sale' || rentalStatus !== 'not-for-rent'),
      )
      expect(
        matchesWhere(
          buildPublicDressWhere({ availability: 'available', mode: 'buy' }),
          record,
        ),
      ).toBe(publicVisibility === 'public' && saleStatus === 'available')
      expect(
        matchesWhere(
          buildPublicDressWhere({ availability: 'available', mode: 'rent' }),
          record,
        ),
      ).toBe(publicVisibility === 'public' && rentalStatus === 'available')
    },
  )

  it('excludes drafts for every requirement', () => {
    const draft: FilterRecord = {
      _status: 'draft',
      publicVisibility: 'public',
      rentalStatus: 'available',
      saleStatus: 'available',
    }

    expect(matchesWhere(buildPublicDressWhere(), draft)).toBe(false)
    expect(
      matchesWhere(buildPublicDressWhere({ availability: 'available', mode: 'buy' }), draft),
    ).toBe(false)
    expect(
      matchesWhere(buildPublicDressWhere({ availability: 'available', mode: 'rent' }), draft),
    ).toBe(false)
  })
})

describe('public dress query consumers', () => {
  beforeEach(() => {
    mocks.find.mockReset()
    mocks.find.mockResolvedValue({ docs: [], totalDocs: 0 })
    vi.mocked(attachDressMedia).mockClear()
  })

  it.each(['buy', 'rent'] as const)('uses the available %s filter for catalogue results', async (mode) => {
    await getDresses(mode)

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'dresses',
        limit: CATALOGUE_PAGE_SIZE,
        overrideAccess: false,
        page: 1,
        depth: 1,
        select: expect.objectContaining({ mainImage: true, saleStatus: true, rentalStatus: true }),
        populate: expect.objectContaining({ media: expect.objectContaining({ sizes: expect.any(Object) }) }),
        where: buildPublicDressWhere({ availability: 'available', mode }),
      }),
    )

    const query = mocks.find.mock.lastCall?.[0]
    expect(query.select).not.toHaveProperty('sku')
    expect(query.select).not.toHaveProperty('gallery')
    expect(query.select).not.toHaveProperty('description')
    expect(query.populate.media).not.toHaveProperty('caption')
    expect(query.populate.media.prefix).toBe(true)
  })

  it('passes the requested catalogue page to Payload pagination', async () => {
    await getDresses('buy', { page: 3 })

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: CATALOGUE_PAGE_SIZE,
        page: 3,
      }),
    )
  })

  it('combines normalized catalogue filters with authoritative availability rules', async () => {
    const { filters } = parseCatalogueFilters(
      { designer: 'designer', priceMax: '2500', silhouette: 'a-line' },
      catalogueFilterOptions,
    )

    await getDresses('buy', { filterOptions: catalogueFilterOptions, filters })

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: buildPublicDressWhere(
          { availability: 'available', mode: 'buy' },
          buildCatalogueFilterConditions('buy', filters, catalogueFilterOptions),
        ),
      }),
    )
  })

  it.each([
    ['buy', 'price-asc'],
    ['rent', 'price-desc'],
  ] as const)('passes the normalized %s price sort to Payload', async (mode, sort) => {
    await getDresses(mode, { sort })

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: getCatalogueDressSort(mode, sort),
      }),
    )
  })

  it('uses the selected mode filter when resolving a booking dress', async () => {
    await getAvailableDressBySlug('grace', 'rent')

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'dresses',
        overrideAccess: false,
        where: buildPublicDressWhere(
          { availability: 'available', mode: 'rent' },
          [{ slug: { equals: 'grace' } }],
        ),
      }),
    )
  })

  it('requires current mode availability in every related-dress query', async () => {
    await getRelatedDresses({ dress: dress(), mode: 'rent' })

    const expectedBase = buildPublicDressWhere(
      { availability: 'available', mode: 'rent' },
      [{ id: { not_equals: 'dress-1' } }],
    )
    expect(mocks.find).toHaveBeenCalledTimes(1)
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 100,
        depth: 0,
        page: 1,
        select: expect.objectContaining({ category: true, createdAt: true, displayOrder: true }),
        overrideAccess: false,
        where: expectedBase,
      }),
    )
    expect(mocks.find.mock.lastCall?.[0].select).not.toHaveProperty('mainImage')
    expect(mocks.find.mock.lastCall?.[0]).not.toHaveProperty('populate')
  })

  it('hydrates only the four ranked related cards and preserves their rank order', async () => {
    const candidates = [
      dress({ id: 'candidate-1', salePrice: 1000 }),
      dress({ id: 'candidate-2', salePrice: 1100 }),
      dress({ id: 'candidate-3', salePrice: 1200 }),
      dress({ id: 'candidate-4', salePrice: 1300 }),
      dress({ id: 'candidate-5', salePrice: 1400 }),
    ]
    mocks.find.mockReset()
    mocks.find.mockResolvedValueOnce({ docs: candidates })
    mocks.find.mockResolvedValueOnce({ docs: [candidates[3], candidates[1], candidates[0]] })

    await getRelatedDresses({ dress: dress({ id: 'reference', salePrice: 1000 }), mode: 'buy' })

    expect(mocks.find).toHaveBeenCalledTimes(2)
    expect(mocks.find.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        collection: 'dresses',
        depth: 1,
        limit: 4,
        overrideAccess: false,
        pagination: false,
        select: expect.objectContaining({ mainImage: true, name: true, saleStatus: true }),
        where: buildPublicDressWhere(
          { availability: 'available', mode: 'buy' },
          [{ id: { in: ['candidate-1', 'candidate-2', 'candidate-3', 'candidate-4'] } }],
        ),
      }),
    )
    expect(vi.mocked(attachDressMedia).mock.lastCall?.[0].map(({ id }) => id)).toEqual([
      'candidate-1',
      'candidate-2',
      'candidate-4',
    ])
  })

  it('uses supported public rules for featured dresses', async () => {
    await getFeaturedDresses()

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        overrideAccess: false,
        where: buildPublicDressWhere({}, [{ featured: { equals: true } }]),
      }),
    )
  })

  it('uses supported public rules and normalized text for dress search', async () => {
    await searchPublicDresses('  Grace  ')

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        overrideAccess: false,
        where: buildPublicDressWhere({}, [
          {
            or: [
              { name: { like: 'Grace' } },
              { shortDescription: { like: 'Grace' } },
              { collectionName: { like: 'Grace' } },
            ],
          },
        ]),
      }),
    )
  })

  it('does not query Payload for an empty dress search', async () => {
    await expect(searchPublicDresses('   ')).resolves.toEqual([])
    expect(mocks.find).not.toHaveBeenCalled()
  })
})
