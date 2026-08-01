import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DressBreadcrumbs } from '@/components/boutique/dress-breadcrumbs'
import {
  getDressHref,
  normalizeCatalogueReturnTo,
} from '@/utilities/dress-routing'

afterEach(cleanup)

describe('dress return navigation', () => {
  it('accepts only bounded internal catalogue URLs with supported parameters', () => {
    const returnTo = '/buy?designer=atelier-one&priceMax=2500&page=2&sort=newest#catalogue-results'

    expect(normalizeCatalogueReturnTo(returnTo, 'buy')).toBe(returnTo)
    expect(normalizeCatalogueReturnTo(returnTo, 'rent')).toBeNull()
    expect(normalizeCatalogueReturnTo('//attacker.example/buy')).toBeNull()
    expect(normalizeCatalogueReturnTo('https://attacker.example/buy')).toBeNull()
    expect(normalizeCatalogueReturnTo('/\\attacker.example/buy')).toBeNull()
    expect(normalizeCatalogueReturnTo('/contact')).toBeNull()
    expect(normalizeCatalogueReturnTo('/buy?next=https://attacker.example')).toBeNull()
    expect(normalizeCatalogueReturnTo('/buy?page=1')).toBeNull()
    expect(normalizeCatalogueReturnTo(['/buy', '/rent'])).toBeNull()
  })

  it('encodes catalogue context and privacy-safe related attribution', () => {
    expect(
      getDressHref({
        mode: 'rent',
        returnTo: '/rent?page=2#catalogue-results',
        slug: 'silk & lace',
        source: 'related',
      }),
    ).toBe(
      '/dresses/silk%20%26%20lace?mode=rent&returnTo=%2Frent%3Fpage%3D2%23catalogue-results&source=related',
    )
  })

  it('renders mode-aware links and canonical BreadcrumbList data', () => {
    const { container } = render(
      <DressBreadcrumbs
        dressName="Grace </script>"
        dressSlug="grace"
        mode="rent"
        returnTo="/rent?page=2#catalogue-results"
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Rent' }).getAttribute('href')).toBe(
      '/rent?page=2#catalogue-results',
    )
    expect(screen.getByRole('link', { name: 'Back to rent catalogue' }).getAttribute('href')).toBe(
      '/rent?page=2#catalogue-results',
    )

    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script?.textContent).toContain('BreadcrumbList')
    expect(script?.textContent).toContain('/dresses/grace')
    expect(script?.textContent).not.toContain('</script>')
  })
})
