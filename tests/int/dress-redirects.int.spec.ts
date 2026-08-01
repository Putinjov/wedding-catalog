import { APIError } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DressPage from '@/app/(frontend)/dresses/[slug]/page'
import { protectAndTrackDressSlug } from '@/collections/Dresses/hooks/slugHistory'
import { syncDressSlugRedirect } from '@/collections/Dresses/hooks/syncDressSlugRedirect'
import { getRequestedDressMode } from '@/lib/catalogue'
import {
  appendDressMode,
  getDressPath,
  getPublicDressRedirect,
} from '@/lib/dress-redirects'
import type { DressWithMedia } from '@/lib/dress-media'
import { getDressBySlug } from '@/lib/getDress'
import type { Dress, Redirect } from '@/payload-types'
import { getCachedRedirects } from '@/utilities/getRedirects'
import {
  normalizeInternalRedirectPath,
  validateRedirectSource,
  validateRedirectTarget,
} from '@/utilities/redirects'

vi.mock('@/lib/getDress', () => ({
  getDressBySlug: vi.fn(),
  getRelatedDresses: vi.fn(),
}))

vi.mock('@/utilities/getRedirects', () => ({
  getCachedRedirects: vi.fn(),
}))

vi.mock('@/components/boutique/dress-detail', () => ({
  DressDetail: () => null,
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
    rentalStatus: 'not-for-rent',
    saleStatus: 'available',
    sku: 'GRACE-1',
    slug: 'grace',
    updatedAt: '2026-07-30T12:00:00.000Z',
    _status: 'published',
    ...overrides,
  }
}

function redirect(overrides: Partial<Redirect> = {}): Redirect {
  return {
    id: 'redirect-1',
    createdAt: '2026-07-30T12:00:00.000Z',
    from: '/dresses/old-grace',
    to: {
      type: 'reference',
      reference: {
        relationTo: 'dresses',
        value: dress(),
      },
    },
    type: '308',
    updatedAt: '2026-07-30T12:00:00.000Z',
    ...overrides,
  }
}

function dressWithMedia(overrides: Partial<DressWithMedia> = {}): DressWithMedia {
  return {
    ...dress(),
    media: {
      gallery: [],
      main: null,
    },
    ...overrides,
  }
}

describe('dress slug history', () => {
  it('requires explicit confirmation before changing a published slug', async () => {
    await expect(
      protectAndTrackDressSlug({
        data: { slug: 'new-grace' },
        operation: 'update',
        originalDoc: dress(),
      } as Parameters<typeof protectAndTrackDressSlug>[0]),
    ).rejects.toBeInstanceOf(APIError)
  })

  it('records each previous slug once after explicit confirmation', async () => {
    const result = await protectAndTrackDressSlug({
      data: {
        confirmSlugChange: true,
        slug: 'final-grace',
      },
      operation: 'update',
      originalDoc: dress({
        slug: 'new-grace',
        slugHistory: [{ slug: 'old-grace' }],
      }),
      req: {
        payload: {
          find: vi.fn().mockResolvedValue({ docs: [] }),
        },
      },
    } as unknown as Parameters<typeof protectAndTrackDressSlug>[0])

    expect(result.slugHistory).toEqual([
      { slug: 'old-grace' },
      { slug: 'new-grace' },
    ])
  })

  it('rejects a slug reserved by another dress redirect', async () => {
    await expect(
      protectAndTrackDressSlug({
        data: {
          confirmSlugChange: true,
          slug: 'reserved-grace',
        },
        operation: 'update',
        originalDoc: dress(),
        req: {
          payload: {
            find: vi.fn().mockResolvedValue({
              docs: [
                redirect({
                  from: '/dresses/reserved-grace',
                  to: {
                    type: 'reference',
                    reference: {
                      relationTo: 'dresses',
                      value: dress({ id: 'dress-2' }),
                    },
                  },
                }),
              ],
            }),
          },
        },
      } as unknown as Parameters<typeof protectAndTrackDressSlug>[0]),
    ).rejects.toMatchObject({
      message: 'This dress slug is reserved by an existing redirect. Choose another slug.',
      status: 409,
    })
  })

  it('does not allow a live slug to change while saving a draft', async () => {
    await expect(
      protectAndTrackDressSlug({
        data: {
          confirmSlugChange: true,
          slug: 'new-grace',
          _status: 'draft',
        },
        operation: 'update',
        originalDoc: dress(),
      } as Parameters<typeof protectAndTrackDressSlug>[0]),
    ).rejects.toThrow('A live dress slug can only be changed while publishing the dress.')
  })
})

describe('dress redirect persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a permanent reference redirect in the same request', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const create = vi.fn().mockResolvedValue({})

    await syncDressSlugRedirect({
      doc: dress({ slug: 'new-grace' }),
      operation: 'update',
      previousDoc: dress({ slug: 'old-grace' }),
      req: {
        payload: {
          create,
          find,
          update: vi.fn(),
        },
      },
    } as unknown as Parameters<typeof syncDressSlugRedirect>[0])

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'redirects',
        where: { from: { equals: '/dresses/old-grace' } },
      }),
    )
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'redirects',
        data: {
          from: '/dresses/old-grace',
          to: {
            type: 'reference',
            reference: {
              relationTo: 'dresses',
              value: 'dress-1',
            },
          },
          type: '308',
        },
      }),
    )
  })

  it('rejects a newly generated slug that reuses a historical redirect path', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [redirect()] })

    await expect(
      syncDressSlugRedirect({
        doc: dress({ slug: 'old-grace' }),
        operation: 'create',
        previousDoc: dress(),
        req: {
          payload: {
            create: vi.fn(),
            find,
            update: vi.fn(),
          },
        },
      } as unknown as Parameters<typeof syncDressSlugRedirect>[0]),
    ).rejects.toMatchObject({
      message: 'This dress slug is reserved by an existing redirect. Choose another slug.',
      status: 409,
    })
  })

  it('updates an existing source redirect instead of creating a duplicate', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 'redirect-1' }] })
    const create = vi.fn()
    const update = vi.fn().mockResolvedValue({})

    await syncDressSlugRedirect({
      doc: dress({ slug: 'new-grace' }),
      operation: 'update',
      previousDoc: dress({ slug: 'old-grace' }),
      req: {
        payload: {
          create,
          find,
          update,
        },
      },
    } as unknown as Parameters<typeof syncDressSlugRedirect>[0])

    expect(create).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'redirects',
        id: 'redirect-1',
      }),
    )
  })
})

describe('dress redirect resolution', () => {
  beforeEach(() => {
    vi.mocked(getDressBySlug).mockReset()
    vi.mocked(getCachedRedirects).mockReset()
  })

  it('redirects an old slug to the current public slug and preserves a valid mode', async () => {
    vi.mocked(getCachedRedirects).mockReturnValue(async () => [redirect()])
    vi.mocked(getDressBySlug).mockResolvedValue(dressWithMedia())

    await expect(getPublicDressRedirect('old-grace', 'rent')).resolves.toBe(
      '/dresses/grace?mode=rent',
    )
    expect(getDressBySlug).toHaveBeenCalledWith('grace')
  })

  it('returns a Next.js permanent redirect response for an old dress route', async () => {
    vi.mocked(getCachedRedirects).mockReturnValue(async () => [redirect()])
    vi.mocked(getDressBySlug)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(dressWithMedia())

    await expect(
      DressPage({
        params: Promise.resolve({ slug: 'old-grace' }),
        searchParams: Promise.resolve({ mode: 'rent' }),
      }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining(
        'NEXT_REDIRECT;replace;/dresses/grace?mode=rent;308;',
      ),
    })
  })

  it('keeps a sold dress public without making its redirect target external', async () => {
    vi.mocked(getCachedRedirects).mockReturnValue(async () => [redirect()])
    vi.mocked(getDressBySlug).mockResolvedValue(
      dressWithMedia({ saleStatus: 'sold' }),
    )

    await expect(getPublicDressRedirect('old-grace', 'buy')).resolves.toBe(
      '/dresses/grace?mode=buy',
    )
  })

  it('keeps hidden or otherwise non-public redirect targets unavailable', async () => {
    vi.mocked(getCachedRedirects).mockReturnValue(async () => [redirect()])
    vi.mocked(getDressBySlug).mockResolvedValue(null)

    await expect(getPublicDressRedirect('old-grace', 'buy')).resolves.toBeNull()
  })

  it('ignores custom, external, and non-dress redirect targets', async () => {
    vi.mocked(getCachedRedirects).mockReturnValue(async () => [
      redirect({
        to: {
          type: 'custom',
          url: 'https://attacker.example',
        },
      }),
    ])

    await expect(getPublicDressRedirect('old-grace', 'buy')).resolves.toBeNull()
    expect(getDressBySlug).not.toHaveBeenCalled()
  })

  it('normalizes mode parameters without preserving invalid values', () => {
    expect(getRequestedDressMode('buy')).toBe('buy')
    expect(getRequestedDressMode(['rent', 'buy'])).toBe('rent')
    expect(getRequestedDressMode('javascript:alert(1)')).toBeNull()
    expect(appendDressMode(getDressPath('grace'), null)).toBe('/dresses/grace')
  })
})

describe('redirect target safety', () => {
  it('allows internal targets and rejects open redirect forms', () => {
    expect(normalizeInternalRedirectPath('/dresses/grace?mode=buy')).toBe(
      '/dresses/grace?mode=buy',
    )
    expect(validateRedirectSource('/legacy')).toBe(true)
    expect(validateRedirectSource('/legacy?next=/')).not.toBe(true)
    expect(validateRedirectTarget('//attacker.example')).not.toBe(true)
    expect(validateRedirectTarget('https://attacker.example')).not.toBe(true)
    expect(validateRedirectTarget('/\\attacker.example')).not.toBe(true)
    expect(normalizeInternalRedirectPath('/safe\r\nLocation: https://attacker.example')).toBeNull()
  })
})
