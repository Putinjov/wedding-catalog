import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getAvailabilityLabel,
  getSupportedDressModes,
  isDressAvailableForMode,
  isDressPublic,
  supportsDressMode,
} from '@/lib/dress-utils'
import { getDresses } from '@/lib/getDresses'
import { Dresses } from '@/collections/Dresses'
import {
  down,
  mapLegacyDressAvailability,
  up,
} from '@/migrations/20260731_221500_split_dress_availability'
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

function dress(overrides: Partial<Dress> = {}): Dress {
  return {
    id: 'dress-1',
    category: 'category-1',
    condition: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    mainImage: 'media-1',
    name: 'Grace',
    publicVisibility: 'public',
    rentalStatus: 'not-for-rent',
    saleStatus: 'available',
    sku: 'GRACE-1',
    slug: 'grace',
    updatedAt: '2026-07-31T12:00:00.000Z',
    _status: 'published',
    ...overrides,
  }
}

function migrationModel(documents: unknown[]) {
  const updateOne = vi.fn().mockResolvedValue({ acknowledged: true })

  return {
    collection: { updateOne },
    find: vi.fn().mockResolvedValue(documents),
    updateOne,
  }
}

function migrationArgs({
  documents,
  versions = [],
}: {
  documents: unknown[]
  versions?: unknown[]
}) {
  const dresses = migrationModel(documents)
  const dressVersions = migrationModel(versions)
  const payload = {
    db: {
      collections: { dresses },
      versions: { dresses: dressVersions },
    },
    logger: { info: vi.fn() },
  }

  return {
    dresses,
    dressVersions,
    downArgs: { payload, session: undefined } as unknown as MigrateDownArgs,
    upArgs: { payload, session: undefined } as unknown as MigrateUpArgs,
  }
}

describe('dress availability domain', () => {
  it('keeps sale available while a dress is rented', () => {
    const rentedDress = dress({ rentalStatus: 'rented', saleStatus: 'available' })

    expect(isDressAvailableForMode(rentedDress, 'buy')).toBe(true)
    expect(isDressAvailableForMode(rentedDress, 'rent')).toBe(false)
    expect(getSupportedDressModes(rentedDress)).toEqual(['buy', 'rent'])
  })

  it('keeps rental available while a public dress is sold', () => {
    const soldDress = dress({ rentalStatus: 'available', saleStatus: 'sold' })

    expect(isDressPublic(soldDress)).toBe(true)
    expect(isDressAvailableForMode(soldDress, 'buy')).toBe(false)
    expect(isDressAvailableForMode(soldDress, 'rent')).toBe(true)
    expect(supportsDressMode(soldDress, 'buy')).toBe(true)
    expect(getAvailabilityLabel(soldDress, 'buy')).toBe('Sold')
  })

  it.each(['cleaning', 'repair'] as const)(
    'blocks rental during %s without blocking sale',
    (rentalStatus) => {
      const unavailableRental = dress({ rentalStatus, saleStatus: 'available' })

      expect(isDressAvailableForMode(unavailableRental, 'rent')).toBe(false)
      expect(isDressAvailableForMode(unavailableRental, 'buy')).toBe(true)
    },
  )

  it.each(['hidden', 'archived'] as const)('keeps %s dresses off public surfaces', (visibility) => {
    expect(isDressPublic(dress({ publicVisibility: visibility }))).toBe(false)
  })
})

describe('dress availability admin schema', () => {
  it('exposes independent status fields with explicit editor guidance', () => {
    const fields = JSON.stringify(Dresses.fields)

    expect(fields).toContain('"name":"saleStatus"')
    expect(fields).toContain('"label":"Sale status"')
    expect(fields).toContain('purchase enquiries independently of rental status')
    expect(fields).toContain('"name":"rentalStatus"')
    expect(fields).toContain('"label":"Rental status"')
    expect(fields).toContain('Cleaning and repair block rental availability')
    expect(fields).toContain('"name":"publicVisibility"')
    expect(fields).toContain('Hidden and archived dresses are excluded from every public surface')
    expect(fields).not.toContain('"name":"availabilityStatus"')
    expect(fields).not.toContain('"name":"forSale"')
    expect(fields).not.toContain('"name":"availableForRent"')
    expect(fields).not.toContain('"name":"isActive"')
  })
})

describe('public catalogue queries', () => {
  beforeEach(() => {
    mocks.find.mockReset()
    mocks.find.mockResolvedValue({ docs: [] })
  })

  it('requires public visibility and currently available sale status for Buy', async () => {
    await getDresses('buy')

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { _status: { equals: 'published' } },
            { publicVisibility: { equals: 'public' } },
            { saleStatus: { equals: 'available' } },
          ],
        },
      }),
    )
  })

  it('requires public visibility and currently available rental status for Rent', async () => {
    await getDresses('rent')

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { _status: { equals: 'published' } },
            { publicVisibility: { equals: 'public' } },
            { rentalStatus: { equals: 'available' } },
          ],
        },
      }),
    )
  })
})

describe('legacy dress availability migration', () => {
  it('maps legacy status without coupling sale and rental modes', () => {
    expect(
      mapLegacyDressAvailability({
        availabilityStatus: 'sold',
        availableForRent: true,
        forSale: true,
        isActive: true,
      }),
    ).toEqual({
      publicVisibility: 'public',
      rentalStatus: 'available',
      saleStatus: 'sold',
    })

    expect(
      mapLegacyDressAvailability({
        availabilityStatus: 'rented',
        availableForRent: true,
        forSale: true,
        isActive: true,
      }),
    ).toEqual({
      publicVisibility: 'public',
      rentalStatus: 'rented',
      saleStatus: 'available',
    })
  })

  it('maps hidden and inactive records to explicit non-public states', () => {
    expect(mapLegacyDressAvailability({ availabilityStatus: 'hidden' }).publicVisibility).toBe(
      'hidden',
    )
    expect(
      mapLegacyDressAvailability({ availabilityStatus: 'hidden', isActive: false })
        .publicVisibility,
    ).toBe('archived')
  })

  it('updates main documents and nested versions while retaining legacy fields', async () => {
    const { dresses, dressVersions, upArgs } = migrationArgs({
      documents: [
        {
          _id: 'dress-1',
          availabilityStatus: 'sold',
          availableForRent: true,
          forSale: true,
          isActive: true,
        },
      ],
      versions: [
        {
          _id: 'version-1',
          version: {
            availabilityStatus: 'cleaning',
            availableForRent: true,
            forSale: true,
            isActive: true,
          },
        },
      ],
    })

    await up(upArgs)

    expect(dresses.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'dress-1' },
      {
        $set: {
          _task04LegacyAvailabilityMigrated: true,
          publicVisibility: 'public',
          rentalStatus: 'available',
          saleStatus: 'sold',
        },
      },
      { session: undefined },
    )
    expect(dressVersions.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'version-1' },
      {
        $set: {
          'version._task04LegacyAvailabilityMigrated': true,
          'version.publicVisibility': 'public',
          'version.rentalStatus': 'cleaning',
          'version.saleStatus': 'available',
        },
      },
      { session: undefined },
    )
  })

  it('refuses rollback before modifying anything when new state has changed', async () => {
    const { dresses, dressVersions, downArgs } = migrationArgs({
      documents: [
        {
          _id: 'dress-1',
          _task04LegacyAvailabilityMigrated: true,
          availabilityStatus: 'available',
          availableForRent: false,
          forSale: true,
          isActive: true,
          publicVisibility: 'public',
          rentalStatus: 'not-for-rent',
          saleStatus: 'sold',
        },
      ],
    })

    await expect(down(downArgs)).rejects.toThrow('cannot be collapsed safely')
    expect(dresses.collection.updateOne).not.toHaveBeenCalled()
    expect(dressVersions.collection.updateOne).not.toHaveBeenCalled()
  })
})
