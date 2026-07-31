import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as getDressesSitemap } from '@/app/(frontend)/(sitemaps)/dresses-sitemap.xml/route'
import { GET as getPagesSitemap } from '@/app/(frontend)/(sitemaps)/pages-sitemap.xml/route'
import {
  revalidateDress,
  revalidateDressDelete,
} from '@/collections/Dresses/hooks/revalidateDress'
import type { Dress } from '@/payload-types'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@payload-config', () => ({
  default: Promise.resolve({}),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
  unstable_cache: (callback: () => unknown) => callback,
}))

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({
    find: mocks.find,
  })),
}))

function dress(overrides: Partial<Dress> = {}): Dress {
  return {
    id: 'dress-1',
    availabilityStatus: 'available',
    category: 'category-1',
    condition: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    mainImage: 'media-1',
    name: 'Grace',
    sku: 'GRACE-1',
    slug: 'grace',
    updatedAt: '2026-07-30T12:00:00.000Z',
    _status: 'published',
    ...overrides,
  }
}

describe('dress sitemap', () => {
  beforeEach(() => {
    mocks.find.mockReset()
    mocks.revalidateTag.mockReset()
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://catalogue.example')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('queries only public dress routes and selects sitemap fields', async () => {
    mocks.find.mockResolvedValue({ docs: [] })

    await getDressesSitemap()

    expect(mocks.find).toHaveBeenCalledWith({
      collection: 'dresses',
      depth: 0,
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: {
        slug: true,
        updatedAt: true,
      },
      sort: 'slug',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { isActive: { equals: true } },
          { availabilityStatus: { not_equals: 'hidden' } },
          {
            or: [
              { forSale: { equals: true } },
              { availableForRent: { equals: true } },
            ],
          },
        ],
      },
    })
  })

  it('uses updatedAt and excludes invalid dress slugs from the XML', async () => {
    mocks.find.mockResolvedValue({
      docs: [
        {
          slug: 'grace',
          updatedAt: '2026-07-30T12:00:00.000Z',
        },
        {
          slug: 'invalid/slug',
          updatedAt: '2026-07-30T13:00:00.000Z',
        },
        {
          slug: '',
          updatedAt: '2026-07-30T14:00:00.000Z',
        },
      ],
    })

    const response = await getDressesSitemap()
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/xml')
    expect(body).toContain('<loc>https://catalogue.example/dresses/grace</loc>')
    expect(body).toContain('<lastmod>2026-07-30T12:00:00.000Z</lastmod>')
    expect(body).not.toContain('invalid/slug')
  })

  it('lists indexable static routes without the search page', async () => {
    mocks.find.mockResolvedValue({
      docs: [
        {
          slug: 'home',
          updatedAt: '2026-07-30T12:00:00.000Z',
        },
      ],
    })

    const response = await getPagesSitemap()
    const body = await response.text()

    expect(body).toContain('<loc>https://catalogue.example/buy</loc>')
    expect(body).toContain('<loc>https://catalogue.example/rent</loc>')
    expect(body).toContain('<loc>https://catalogue.example/book-a-fitting</loc>')
    expect(body).toContain('<loc>https://catalogue.example/posts</loc>')
    expect(body).not.toContain('/search</loc>')
  })
})

describe('dress sitemap revalidation', () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset()
    mocks.revalidateTag.mockReset()
  })

  it('invalidates after published updates, visibility changes, and unpublishing', async () => {
    const published = dress()

    await revalidateDress({
      doc: published,
      previousDoc: published,
      req: { context: {} },
    } as Parameters<typeof revalidateDress>[0])
    await revalidateDress({
      doc: dress({ isActive: false }),
      previousDoc: dress({ isActive: true }),
      req: { context: {} },
    } as Parameters<typeof revalidateDress>[0])
    await revalidateDress({
      doc: dress({ _status: 'draft' }),
      previousDoc: published,
      req: { context: {} },
    } as Parameters<typeof revalidateDress>[0])

    expect(mocks.revalidateTag).toHaveBeenCalledTimes(3)
    expect(mocks.revalidateTag).toHaveBeenCalledWith('dresses-sitemap', 'max')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dresses/grace')
  })

  it('skips draft-only and explicitly disabled revalidation', async () => {
    await revalidateDress({
      doc: dress({ _status: 'draft' }),
      previousDoc: dress({ _status: 'draft' }),
      req: { context: {} },
    } as Parameters<typeof revalidateDress>[0])
    await revalidateDress({
      doc: dress(),
      previousDoc: dress(),
      req: { context: { disableRevalidate: true } },
    } as unknown as Parameters<typeof revalidateDress>[0])

    expect(mocks.revalidateTag).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('invalidates when a published dress is deleted', async () => {
    await revalidateDressDelete({
      doc: dress(),
      req: { context: {} },
    } as Parameters<typeof revalidateDressDelete>[0])

    expect(mocks.revalidateTag).toHaveBeenCalledWith('dresses-sitemap', 'max')
  })
})
