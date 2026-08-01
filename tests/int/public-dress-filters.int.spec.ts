import type { Where } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAvailableDressBySlug, getRelatedDresses } from '@/lib/getDress'
import { getDresses } from '@/lib/getDresses'
import { getFeaturedDresses } from '@/lib/getFeaturedDresses'
import { CATALOGUE_PAGE_SIZE } from '@/lib/catalogue'
import { buildPublicDressWhere } from '@/lib/public-dress-filters'
import { searchPublicDresses } from '@/lib/searchDresses'
import type { Dress } from '@/payload-types'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
}))

vi.mock('@payload-config', () => ({
  default: Promise.resolve({}),
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
  })

  it.each(['buy', 'rent'] as const)('uses the available %s filter for catalogue results', async (mode) => {
    await getDresses(mode)

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'dresses',
        limit: CATALOGUE_PAGE_SIZE,
        overrideAccess: false,
        page: 1,
        where: buildPublicDressWhere({ availability: 'available', mode }),
      }),
    )
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
    const expectedPreferred = buildPublicDressWhere(
      { availability: 'available', mode: 'rent' },
      [
        { id: { not_equals: 'dress-1' } },
        { or: [{ category: { equals: 'category-1' } }] },
      ],
    )

    expect(mocks.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: expectedPreferred }),
    )
    expect(mocks.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: expectedBase }),
    )
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
