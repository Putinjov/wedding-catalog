import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCatalogueFilterOptions } from '@/lib/getCatalogueFilterOptions'

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
    getPayload: vi.fn(async () => ({ find: mocks.find })),
  }
})

describe('catalogue filter options', () => {
  beforeEach(() => {
    mocks.find.mockReset()
    mocks.find.mockImplementation(({ collection }: { collection: string }) => {
      if (collection === 'categories') {
        return Promise.resolve({
          docs: [{ id: 'category-1', slug: 'bridal', title: 'Bridal' }],
        })
      }

      return Promise.resolve({
        docs: [{ id: `${collection}-1`, name: collection, slug: `${collection}-slug` }],
      })
    })
  })

  it('loads only active public filter lookups through the Payload Local API', async () => {
    const options = await getCatalogueFilterOptions()

    expect(options.categories).toEqual([
      { id: 'category-1', label: 'Bridal', slug: 'bridal' },
    ])
    expect(mocks.find.mock.calls.map(([query]) => query.collection)).toEqual([
      'categories',
      'colors',
      'designers',
      'fabrics',
      'silhouettes',
    ])
    expect(mocks.find).toHaveBeenCalledTimes(5)
    expect(mocks.find).not.toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'sizes' }),
    )
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'designers',
        depth: 0,
        overrideAccess: false,
        pagination: false,
        where: { isActive: { not_equals: false } },
      }),
    )
  })
})
