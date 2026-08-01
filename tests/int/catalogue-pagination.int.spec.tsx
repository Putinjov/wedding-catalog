import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CataloguePagination } from '@/components/boutique/catalogue-pagination'
import {
  getCataloguePageURL,
  getOutOfRangeCataloguePage,
  parseCataloguePage,
} from '@/lib/catalogue'

afterEach(() => {
  cleanup()
})

describe('catalogue page parameters', () => {
  it.each([
    [undefined, { page: 1, shouldRedirect: false }],
    ['2', { page: 2, shouldRedirect: false }],
    ['1', { page: 1, shouldRedirect: true }],
    ['0', { page: 1, shouldRedirect: true }],
    ['1.5', { page: 1, shouldRedirect: true }],
    ['invalid', { page: 1, shouldRedirect: true }],
    [['2', '3'], { page: 2, shouldRedirect: true }],
  ])('normalizes %j', (value, expected) => {
    expect(parseCataloguePage(value)).toEqual(expected)
  })

  it('redirects an out-of-range page to the final result page', () => {
    expect(getOutOfRangeCataloguePage(5, 3)).toBe(3)
    expect(getOutOfRangeCataloguePage(2, 0)).toBe(1)
    expect(getOutOfRangeCataloguePage(3, 3)).toBeNull()
  })

  it('preserves current query state while changing the page', () => {
    expect(
      getCataloguePageURL({
        includeResultsAnchor: true,
        mode: 'rent',
        page: 3,
        searchParams: { designer: ['one', 'two'], page: '2', sort: 'newest' },
      }),
    ).toBe('/rent?designer=one&designer=two&sort=newest&page=3#catalogue-results')
  })
})

describe('catalogue pagination controls', () => {
  it('renders keyboard-accessible previous and next links', () => {
    render(
      <CataloguePagination
        mode="buy"
        page={2}
        searchParams={{ page: '2', sort: 'newest' }}
        totalPages={4}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Catalogue pagination' })).not.toBeNull()
    expect(
      screen.getByRole('link', { name: 'Go to catalogue page 1' }).getAttribute('href'),
    ).toBe('/buy?sort=newest#catalogue-results')
    expect(
      screen.getByRole('link', { name: 'Go to catalogue page 3' }).getAttribute('href'),
    ).toBe('/buy?sort=newest&page=3#catalogue-results')
    expect(screen.getByText('Page 2 of 4').getAttribute('aria-current')).toBe('page')
  })

  it('omits controls for a single page', () => {
    const { container } = render(
      <CataloguePagination mode="rent" page={1} searchParams={{}} totalPages={1} />,
    )

    expect(container.innerHTML).toBe('')
  })
})
