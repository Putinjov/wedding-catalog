import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'
import { ValidationError } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { Dresses } from '@/collections/Dresses'
import {
  getDressBusinessValidationErrors,
  populateGalleryAltText,
  rejectDuplicateDressSlug,
  validateDressBusinessRules,
} from '@/collections/Dresses/hooks/validateDressBusinessRules'
import {
  deriveSalePriceOnRequest,
  down,
  up,
} from '@/migrations/20260731_224500_add_dress_business_validation'
import type { Dress } from '@/payload-types'

function dress(overrides: Partial<Dress> = {}): Partial<Dress> {
  return {
    condition: 'new',
    gallery: [],
    name: 'Grace',
    publicVisibility: 'public',
    rentalPrice: 500,
    rentalStatus: 'available',
    salePrice: 2500,
    salePriceOnRequest: false,
    saleStatus: 'available',
    _status: 'published',
    ...overrides,
  }
}

function errorPaths(overrides: Partial<Dress>): string[] {
  return getDressBusinessValidationErrors(dress(overrides)).map((error) => error.path)
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

describe('dress business rules', () => {
  it('accepts independent sale and rental states with an optional zero deposit', () => {
    expect(
      getDressBusinessValidationErrors(
        dress({ rentalStatus: 'rented', saleStatus: 'available', securityDeposit: 0 }),
      ),
    ).toEqual([])
    expect(
      getDressBusinessValidationErrors(
        dress({ rentalStatus: 'available', saleStatus: 'sold', securityDeposit: null }),
      ),
    ).toEqual([])
  })

  it('accepts an explicit price-on-request state without a sale price', () => {
    expect(
      getDressBusinessValidationErrors(
        dress({ salePrice: null, salePriceOnRequest: true }),
      ),
    ).toEqual([])
  })

  it.each([
    [{ salePrice: null, salePriceOnRequest: false }, 'salePrice'],
    [{ salePrice: 0 }, 'salePrice'],
    [{ salePrice: 2500, salePriceOnRequest: true }, 'salePriceOnRequest'],
    [{ previousSalePrice: 2000, salePrice: 2500 }, 'previousSalePrice'],
    [{ previousSalePrice: 3000, salePrice: null, salePriceOnRequest: true }, 'previousSalePrice'],
    [{ rentalPrice: null }, 'rentalPrice'],
    [{ rentalPrice: 0 }, 'rentalPrice'],
    [{ securityDeposit: -1 }, 'securityDeposit'],
    [
      {
        publicVisibility: 'public',
        rentalPrice: null,
        rentalStatus: 'not-for-rent',
        salePrice: null,
        saleStatus: 'not-for-sale',
      },
      'publicVisibility',
    ],
    [{ condition: 'needs-cleaning', rentalStatus: 'available' }, 'rentalStatus'],
    [{ condition: 'needs-repair', rentalStatus: 'available' }, 'rentalStatus'],
  ] satisfies Array<[Partial<Dress>, string]>)('rejects invalid published data %#', (input, path) => {
    expect(errorPaths(input)).toContain(path)
  })

  it('allows hidden non-commercial records and unavailable rental statuses during care', () => {
    expect(
      getDressBusinessValidationErrors(
        dress({
          condition: 'needs-cleaning',
          publicVisibility: 'hidden',
          rentalPrice: null,
          rentalStatus: 'not-for-rent',
          salePrice: null,
          saleStatus: 'not-for-sale',
        }),
      ),
    ).toEqual([])
    expect(
      getDressBusinessValidationErrors(
        dress({ condition: 'needs-repair', rentalStatus: 'repair' }),
      ),
    ).toEqual([])
  })

  it('auto-generates missing gallery alt text without replacing authored text', () => {
    const result = populateGalleryAltText(
      dress({
        gallery: [
          { alt: null, image: 'media-1' },
          { alt: 'Custom back view', image: 'media-2' },
          { alt: '   ', image: 'media-3' },
        ],
      }),
    )

    expect(result.gallery).toEqual([
      { alt: 'Grace', image: 'media-1' },
      { alt: 'Custom back view', image: 'media-2' },
      { alt: 'Grace', image: 'media-3' },
    ])
  })

  it('allows incomplete drafts but rejects the same data when published', () => {
    const hookArgs = (data: Partial<Dress>) =>
      ({
        data,
        operation: 'update',
        originalDoc: dress(),
        req: { t: undefined },
      }) as unknown as Parameters<typeof validateDressBusinessRules>[0]

    expect(
      validateDressBusinessRules(
        hookArgs({ _status: 'draft', rentalPrice: null, salePrice: null }),
      ),
    ).toEqual(expect.objectContaining({ _status: 'draft' }))
    expect(() =>
      validateDressBusinessRules(
        hookArgs({ _status: 'published', rentalPrice: null, salePrice: null }),
      ),
    ).toThrow(ValidationError)
  })
})

describe('dress slug validation', () => {
  function hookArgs(find: ReturnType<typeof vi.fn>, id?: string) {
    return {
      operation: id ? 'update' : 'create',
      originalDoc: id ? { id } : undefined,
      req: {
        payload: { config: {}, find },
        t: undefined,
      },
      siblingData: { slug: 'grace' },
      value: true,
    } as unknown as Parameters<typeof rejectDuplicateDressSlug>[0]
  }

  it('rejects another dress with the same slug while allowing the current document', async () => {
    const duplicateFind = vi.fn().mockResolvedValue({ docs: [{ id: 'other-dress' }] })
    await expect(rejectDuplicateDressSlug(hookArgs(duplicateFind, 'current-dress'))).rejects.toThrow(
      'The following field is invalid: slug',
    )

    const selfFind = vi.fn().mockResolvedValue({ docs: [{ id: 'current-dress' }] })
    await expect(rejectDuplicateDressSlug(hookArgs(selfFind, 'current-dress'))).resolves.toBe(true)
  })

  it('retains the Payload unique index as the concurrency-safe constraint', () => {
    const schema = JSON.stringify(Dresses.fields)

    expect(schema).toContain('"name":"slug"')
    expect(schema).toContain('"unique":true')
    expect(schema).toContain('"index":true')
    expect(schema).toContain('"name":"salePriceOnRequest"')
  })
})

describe('dress business validation migration', () => {
  it('derives the explicit state from the existing storefront semantics', () => {
    expect(deriveSalePriceOnRequest({ salePrice: null, saleStatus: 'available' })).toBe(true)
    expect(deriveSalePriceOnRequest({ saleStatus: 'sold' })).toBe(true)
    expect(deriveSalePriceOnRequest({ salePrice: 2500, saleStatus: 'available' })).toBe(false)
    expect(deriveSalePriceOnRequest({ saleStatus: 'not-for-sale' })).toBe(false)
  })

  it('backfills main documents and versions without changing prices', async () => {
    const { dresses, dressVersions, upArgs } = migrationArgs({
      documents: [{ _id: 'dress-1', salePrice: null, saleStatus: 'available' }],
      versions: [
        {
          _id: 'version-1',
          version: { salePrice: 2500, saleStatus: 'available' },
        },
      ],
    })

    await up(upArgs)

    expect(dresses.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'dress-1' },
      {
        $set: {
          _task06SalePriceOnRequestMigrated: true,
          salePriceOnRequest: true,
        },
      },
      { session: undefined },
    )
    expect(dressVersions.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'version-1' },
      {
        $set: {
          'version._task06SalePriceOnRequestMigrated': true,
          'version.salePriceOnRequest': false,
        },
      },
      { session: undefined },
    )
  })

  it('aborts before writing when an untracked new field could be reinterpreted', async () => {
    const { dresses, dressVersions, upArgs } = migrationArgs({
      documents: [
        {
          _id: 'dress-1',
          salePrice: null,
          salePriceOnRequest: false,
          saleStatus: 'available',
        },
      ],
    })

    await expect(up(upArgs)).rejects.toThrow('exists without a migration marker')
    expect(dresses.collection.updateOne).not.toHaveBeenCalled()
    expect(dressVersions.collection.updateOne).not.toHaveBeenCalled()
  })

  it('rolls back only when the old implicit state remains equivalent', async () => {
    const safe = migrationArgs({
      documents: [
        {
          _id: 'dress-1',
          _task06SalePriceOnRequestMigrated: true,
          salePrice: null,
          salePriceOnRequest: true,
          saleStatus: 'available',
        },
      ],
    })

    await down(safe.downArgs)
    expect(safe.dresses.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'dress-1' },
      {
        $unset: {
          _task06SalePriceOnRequestMigrated: 1,
          salePriceOnRequest: 1,
        },
      },
      { session: undefined },
    )

    const unsafe = migrationArgs({
      documents: [
        {
          _id: 'dress-2',
          _task06SalePriceOnRequestMigrated: true,
          salePrice: null,
          salePriceOnRequest: false,
          saleStatus: 'available',
        },
      ],
    })
    await expect(down(unsafe.downArgs)).rejects.toThrow('cannot be represented safely')
    expect(unsafe.dresses.collection.updateOne).not.toHaveBeenCalled()
  })
})
