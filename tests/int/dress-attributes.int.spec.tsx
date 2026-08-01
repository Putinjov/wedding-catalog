import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({
  APIError: class PayloadAPIError extends Error {},
  slugField: (options: {
    overrides?: (field: Record<string, unknown>) => Record<string, unknown>
  }) => {
    const field = {
      fields: [
        { name: 'slug', type: 'text' },
        { name: 'generateSlug', type: 'checkbox' },
      ],
      name: 'slug',
      type: 'group',
    }

    return options.overrides?.(field) ?? field
  },
}))

vi.mock('@/components/RichText', () => ({
  default: () => null,
}))

afterEach(() => {
  cleanup()
})

import { Dresses } from '@/collections/Dresses'
import { Backs } from '@/collections/Lookups/Backs'
import { Embellishments } from '@/collections/Lookups/Embellishments'
import { Necklines } from '@/collections/Lookups/Necklines'
import { Sleeves } from '@/collections/Lookups/Sleeves'
import { Trains } from '@/collections/Lookups/Trains'
import { Waistlines } from '@/collections/Lookups/Waistlines'
import { DressDetails } from '@/components/boutique/dress-details'
import type { Dress, Neckline } from '@/payload-types'

type SchemaField = Record<string, unknown>

const timestamps = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function dress(overrides: Partial<Dress> = {}): Dress {
  return {
    id: 'dress-1',
    displayOrder: 0,
    name: 'Test dress',
    slug: 'test-dress',
    sku: 'INTERNAL-TEST-SKU',
    category: 'category-1',
    condition: 'new',
    mainImage: 'media-1',
    publicVisibility: 'public',
    rentalStatus: 'not-for-rent',
    saleStatus: 'available',
    ...timestamps,
    ...overrides,
  }
}

function lookup(id: string, name: string): Neckline {
  return {
    id,
    isActive: true,
    name,
    slug: id,
    sortOrder: 0,
    ...timestamps,
  }
}

function findField(fields: unknown[], name: string): SchemaField | null {
  for (const candidate of fields) {
    if (!candidate || typeof candidate !== 'object') {
      continue
    }

    const field = candidate as SchemaField
    if (field.name === name) {
      return field
    }

    if (Array.isArray(field.fields)) {
      const nestedField = findField(field.fields, name)
      if (nestedField) {
        return nestedField
      }
    }

    if (Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        if (!tab || typeof tab !== 'object') {
          continue
        }

        const tabFields = (tab as SchemaField).fields
        if (Array.isArray(tabFields)) {
          const nestedField = findField(tabFields, name)
          if (nestedField) {
            return nestedField
          }
        }
      }
    }
  }

  return null
}

describe('dress attributes schema', () => {
  it.each([
    ['neckline', 'necklines', false],
    ['sleeves', 'sleeves', false],
    ['train', 'trains', false],
    ['back', 'backs', false],
    ['waistline', 'waistlines', false],
    ['embellishments', 'embellishments', true],
  ])('defines the optional %s relationship', (name, relationTo, hasMany) => {
    const field = findField(Dresses.fields, name)

    expect(field).toMatchObject({
      name,
      relationTo,
      type: 'relationship',
    })
    expect(field?.required).not.toBe(true)
    expect(field?.hasMany === true).toBe(hasMany)
  })

  it.each([
    'fitNotes',
    'alterationPossibilities',
    'alterationLimitations',
    'includedAccessories',
    'optionalAccessories',
  ])('keeps %s optional', (name) => {
    expect(findField(Dresses.fields, name)?.required).not.toBe(true)
  })

  it('registers dedicated lookup collections without predefined taxonomy values', () => {
    expect([
      Necklines.slug,
      Sleeves.slug,
      Trains.slug,
      Backs.slug,
      Waistlines.slug,
      Embellishments.slug,
    ]).toEqual(['necklines', 'sleeves', 'trains', 'backs', 'waistlines', 'embellishments'])

    for (const collection of [Necklines, Sleeves, Trains, Backs, Waistlines, Embellishments]) {
      expect(findField(collection.fields, 'name')).toMatchObject({
        localized: true,
        required: true,
        type: 'text',
      })
      expect(collection.fields.some((field) => 'options' in field)).toBe(false)
    }
  })
})

describe('dress attribute storefront presentation', () => {
  it('renders populated attributes, fitting guidance and accessories without exposing the SKU', () => {
    render(
      <DressDetails
        dress={dress({
          alterationLimitations: 'Test alteration limitation',
          alterationPossibilities: 'Test alteration possibility',
          back: lookup('test-back', 'Test back'),
          embellishments: [
            lookup('test-embellishment-one', 'Test embellishment one'),
            lookup('test-embellishment-two', 'Test embellishment two'),
          ],
          fitNotes: 'Test fit note',
          includedAccessories: [{ item: 'Test included accessory' }],
          neckline: lookup('test-neckline', 'Test neckline'),
          optionalAccessories: [{ item: 'Test optional accessory' }],
          sleeves: lookup('test-sleeves', 'Test sleeves'),
          train: lookup('test-train', 'Test train'),
          waistline: lookup('test-waistline', 'Test waistline'),
        })}
      />,
    )

    expect(screen.getByText('Test neckline')).toBeTruthy()
    expect(screen.getByText('Test sleeves')).toBeTruthy()
    expect(screen.getByText('Test train')).toBeTruthy()
    expect(screen.getByText('Test back')).toBeTruthy()
    expect(screen.getByText('Test waistline')).toBeTruthy()
    expect(screen.getByText('Test embellishment one, Test embellishment two')).toBeTruthy()
    expect(screen.getByText('Test included accessory')).toBeTruthy()
    expect(screen.getByText('Test optional accessory')).toBeTruthy()
    expect(screen.getByText('Test fit note')).toBeTruthy()
    expect(screen.getByText('Alteration possibilities: Test alteration possibility')).toBeTruthy()
    expect(screen.getByText('Alteration limitations: Test alteration limitation')).toBeTruthy()
    expect(
      screen.getByText(
        'Every dress is individually fitted and professionally altered for you by our boutique team.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText('INTERNAL-TEST-SKU')).toBeNull()
    expect(screen.queryByText('Available sizes')).toBeNull()
  })

  it('keeps optional attribute rows hidden while retaining the fitting promise', () => {
    render(<DressDetails dress={dress()} />)

    expect(screen.queryByText('Neckline')).toBeNull()
    expect(screen.queryByText('Included accessories')).toBeNull()
    expect(
      screen.getByText(
        'Every dress is individually fitted and professionally altered for you by our boutique team.',
      ),
    ).toBeTruthy()
  })
})
