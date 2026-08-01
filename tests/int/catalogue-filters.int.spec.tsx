import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CatalogueFilters } from '@/components/boutique/catalogue-filters'
import {
  buildCatalogueFilterConditions,
  parseCatalogueFilters,
  type CatalogueFilterOptions,
} from '@/lib/catalogue-filters'

const options: CatalogueFilterOptions = {
  categories: [
    { id: 'category-bridal', label: 'Bridal', slug: 'bridal' },
  ],
  colours: [
    { id: 'colour-ivory', label: 'Ivory', slug: 'ivory' },
  ],
  designers: [
    { id: 'designer-one', label: 'Designer One', slug: 'designer-one' },
    { id: 'designer-two', label: 'Designer Two', slug: 'designer-two' },
  ],
  fabrics: [
    { id: 'fabric-lace', label: 'Lace', slug: 'lace' },
  ],
  silhouettes: [
    { id: 'silhouette-line', label: 'A-line', slug: 'a-line' },
  ],
}

afterEach(() => {
  cleanup()
})

describe('catalogue filter parameters', () => {
  it('normalizes valid multi-value filters without inventing price bands', () => {
    const parsed = parseCatalogueFilters(
      {
        category: 'bridal',
        colour: 'ivory',
        designer: ['designer-one', 'designer-two'],
        fabric: 'lace',
        featured: '1',
        priceMax: '2500',
        priceMin: '500',
        silhouette: 'a-line',
      },
      options,
    )

    expect(parsed.shouldRedirect).toBe(false)
    expect(parsed.activeCount).toBe(9)
    expect(parsed.searchParams).toEqual({
      category: ['bridal'],
      colour: ['ivory'],
      designer: ['designer-one', 'designer-two'],
      fabric: ['lace'],
      featured: '1',
      priceMax: '2500',
      priceMin: '500',
      silhouette: ['a-line'],
    })
  })

  it('drops unknown values, removes duplicates, and orders reversed price bounds', () => {
    const parsed = parseCatalogueFilters(
      {
        category: 'unknown',
        designer: ['designer-two', 'designer-one', 'designer-one'],
        featured: 'yes',
        priceMax: '1000.00',
        priceMin: '3000',
      },
      options,
    )

    expect(parsed.shouldRedirect).toBe(true)
    expect(parsed.filters.category).toEqual([])
    expect(parsed.filters.designer).toEqual(['designer-one', 'designer-two'])
    expect(parsed.filters.featured).toBe(false)
    expect(parsed.filters.priceMin).toBe(1000)
    expect(parsed.filters.priceMax).toBe(3000)
    expect(parsed.searchParams.priceMin).toBe('1000')
    expect(parsed.searchParams.priceMax).toBe('3000')
  })

  it('combines relationship, featured, and mode-specific price conditions', () => {
    const { filters } = parseCatalogueFilters(
      {
        colour: ['ivory'],
        designer: ['designer-one', 'designer-two'],
        featured: '1',
        priceMax: '1200',
        priceMin: '400',
      },
      options,
    )

    expect(buildCatalogueFilterConditions('rent', filters, options)).toEqual([
      { colors: { in: ['colour-ivory'] } },
      { designer: { in: ['designer-one', 'designer-two'] } },
      { featured: { equals: true } },
      { rentalPrice: { greater_than_equal: 400, less_than_equal: 1200 } },
    ])
  })
})

describe('catalogue filter controls', () => {
  it('renders accessible URL-backed controls, active chips, and no size filter', () => {
    const parsed = parseCatalogueFilters(
      { designer: 'designer-one', featured: '1', priceMax: '2500' },
      options,
    )

    render(
      <CatalogueFilters
        activeCount={parsed.activeCount}
        filters={parsed.filters}
        mode="buy"
        options={options}
        searchParams={{ ...parsed.searchParams, sort: 'newest' }}
      >
        <p>Catalogue results</p>
      </CatalogueFilters>,
    )

    expect(screen.getByRole('button', { name: 'Filters (3)' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Designer One' })).toHaveProperty(
      'checked',
      true,
    )
    expect(screen.getByLabelText('Maximum')).toHaveProperty('value', '2500')
    expect(
      screen
        .getByRole('link', { name: 'Remove filter Designer: Designer One' })
        .getAttribute('href'),
    ).toBe('/buy?featured=1&priceMax=2500&sort=newest#catalogue-results')
    expect(screen.getByText('Catalogue results')).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: /size/i })).toBeNull()
  })
})
