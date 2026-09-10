import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { BoutiqueFooter } from '@/components/boutique/boutique-footer'
import { publicBusinessSocialProfiles } from '@/config/business'

afterEach(cleanup)

describe('footer information architecture', () => {
  it('renders unique destinations in clear navigation groups', () => {
    render(<BoutiqueFooter />)
    const footer = screen.getByRole('contentinfo')
    const destinations = within(footer)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
    expect(new Set(destinations).size).toBe(destinations.length)
    expect(screen.getByRole('navigation', { name: 'Collection' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Information' })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: /edit/i })).toBeNull()
  })

  it('groups the address and contact methods separately', () => {
    render(<BoutiqueFooter />)
    const visit = screen.getByRole('region', { name: 'Visit us' })
    expect(within(visit).getByText('R42 YX50')).toBeTruthy()
    expect(within(visit).getByRole('link', { name: 'sales@caitbridal.ie' })).toBeTruthy()
    expect(visit.querySelector('address')).not.toBeNull()
  })

  it('provides accessible social icons with 44px targets and existing destinations', () => {
    render(<BoutiqueFooter />)
    const social = screen.getByRole('navigation', { name: 'Social media' })
    for (const profile of publicBusinessSocialProfiles) {
      const link = within(social).getByRole('link', { name: new RegExp(profile.label) })
      expect(link.getAttribute('href')).toBe(profile.url)
      expect(link.className).toContain('min-h-11')
      expect(link.className).toContain('min-w-11')
      expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    }
  })
})
