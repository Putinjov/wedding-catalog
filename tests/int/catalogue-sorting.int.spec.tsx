import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CatalogueSortControl } from '@/components/boutique/catalogue-sort'
import { Dresses } from '@/collections/Dresses'
import {
  catalogueSortOptions,
  getCatalogueDressSort,
  normalizeCatalogueSortSearchParams,
  parseCatalogueSort,
} from '@/lib/catalogue'
import {
  down,
  up,
} from '@/migrations/20260801_154500_add_catalogue_display_order'

afterEach(() => {
  cleanup()
})

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

describe('catalogue sort parameters', () => {
  it.each([
    [undefined, { shouldRedirect: false, sort: 'featured' }],
    ['featured', { shouldRedirect: true, sort: 'featured' }],
    ['curated', { shouldRedirect: false, sort: 'curated' }],
    ['newest', { shouldRedirect: false, sort: 'newest' }],
    ['price-asc', { shouldRedirect: false, sort: 'price-asc' }],
    ['price-desc', { shouldRedirect: false, sort: 'price-desc' }],
    ['invalid', { shouldRedirect: true, sort: 'featured' }],
    [['newest', 'curated'], { shouldRedirect: true, sort: 'newest' }],
  ])('normalizes %j', (value, expected) => {
    expect(parseCatalogueSort(value)).toEqual(expected)
  })

  it('removes the default sort from normalized URL state', () => {
    expect(
      normalizeCatalogueSortSearchParams({ designer: 'one', sort: 'invalid' }, 'featured'),
    ).toEqual({ designer: 'one', sort: undefined })
    expect(normalizeCatalogueSortSearchParams({}, 'newest')).toEqual({ sort: 'newest' })
  })
})

describe('catalogue Payload sort', () => {
  it('uses deterministic featured, curated, and newest ordering', () => {
    expect(getCatalogueDressSort('buy', 'featured')).toEqual([
      '-featured',
      'displayOrder',
      '-createdAt',
      'id',
    ])
    expect(getCatalogueDressSort('rent', 'curated')).toEqual([
      'displayOrder',
      '-createdAt',
      'id',
    ])
    expect(getCatalogueDressSort('buy', 'newest')).toEqual(['-createdAt', 'id'])
  })

  it('uses the commercial-mode price with stable secondary ordering', () => {
    expect(getCatalogueDressSort('buy', 'price-asc')).toEqual([
      'salePrice',
      'displayOrder',
      '-createdAt',
      'id',
    ])
    expect(getCatalogueDressSort('rent', 'price-desc')).toEqual([
      '-rentalPrice',
      'displayOrder',
      '-createdAt',
      'id',
    ])
  })
})

describe('catalogue sort control', () => {
  it('renders every supported sort and preserves non-page query state', () => {
    const { container } = render(
      <CatalogueSortControl
        mode="rent"
        searchParams={{ designer: ['one', 'two'], page: '3', sort: 'newest' }}
        sort="newest"
      />,
    )

    const select = screen.getByLabelText('Sort by') as HTMLSelectElement
    expect(select.value).toBe('newest')
    expect(Array.from(select.options).map((option) => option.value)).toEqual(
      catalogueSortOptions.map((option) => option.value),
    )

    const form = select.closest('form')
    expect(form?.getAttribute('action')).toBe('/rent#catalogue-results')
    expect(form?.getAttribute('method')).toBe('get')
    expect(
      Array.from(container.querySelectorAll('input[type="hidden"]')).map((input) => ({
        name: input.getAttribute('name'),
        value: input.getAttribute('value'),
      })),
    ).toEqual([
      { name: 'designer', value: 'one' },
      { name: 'designer', value: 'two' },
    ])
    expect(screen.getByRole('button', { name: 'Apply' }).getAttribute('type')).toBe('submit')
  })
})

describe('catalogue display-order schema and migration', () => {
  it('adds one featured field and a required display order with a safe default', () => {
    const schema = JSON.stringify(Dresses.fields)

    expect(schema.match(/"name":"featured"/g)).toHaveLength(1)
    expect(schema).toContain(
      '"name":"displayOrder","type":"number","required":true,"defaultValue":0,"min":0',
    )
  })

  it('backfills documents and versions with neutral curated order', async () => {
    const { dresses, dressVersions, upArgs } = migrationArgs({
      documents: [{ _id: 'dress-1' }],
      versions: [{ _id: 'version-1', version: {} }],
    })

    await up(upArgs)

    expect(dresses.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'dress-1' },
      {
        $set: {
          _task10DisplayOrderMigrated: true,
          displayOrder: 0,
        },
      },
      { session: undefined },
    )
    expect(dressVersions.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'version-1' },
      {
        $set: {
          'version._task10DisplayOrderMigrated': true,
          'version.displayOrder': 0,
        },
      },
      { session: undefined },
    )
  })

  it('aborts before overwriting an untracked display order', async () => {
    const { dresses, dressVersions, upArgs } = migrationArgs({
      documents: [{ _id: 'dress-1', displayOrder: 8 }],
    })

    await expect(up(upArgs)).rejects.toThrow('exists without a migration marker')
    expect(dresses.collection.updateOne).not.toHaveBeenCalled()
    expect(dressVersions.collection.updateOne).not.toHaveBeenCalled()
  })

  it('rolls back only neutral, migration-owned values', async () => {
    const safe = migrationArgs({
      documents: [
        { _id: 'dress-1', _task10DisplayOrderMigrated: true, displayOrder: 0 },
      ],
    })

    await down(safe.downArgs)
    expect(safe.dresses.collection.updateOne).toHaveBeenCalledWith(
      { _id: 'dress-1' },
      {
        $unset: {
          _task10DisplayOrderMigrated: 1,
          displayOrder: 1,
        },
      },
      { session: undefined },
    )

    const unsafe = migrationArgs({
      documents: [
        { _id: 'dress-2', _task10DisplayOrderMigrated: true, displayOrder: 4 },
      ],
    })
    await expect(down(unsafe.downArgs)).rejects.toThrow('cannot be represented safely')
    expect(unsafe.dresses.collection.updateOne).not.toHaveBeenCalled()
  })
})
