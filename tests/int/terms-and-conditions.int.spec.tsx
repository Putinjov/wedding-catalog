import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import TermsAndConditionsPage, { metadata } from '@/app/(frontend)/terms-and-conditions/page'
import { BoutiqueFooter } from '@/components/boutique/boutique-footer'
import { AnnouncementBar } from '@/components/boutique/announcement-bar'
import { termsSections } from '@/content/terms-and-conditions'

afterEach(cleanup)

describe('boutique terms and conditions', () => {
  it('places the boutique announcement in a named landmark', () => {
    render(<AnnouncementBar />)
    expect(screen.getByRole('region', { name: 'Boutique services' })).toBeTruthy()
  })

  it('renders all 27 supplied numbered sections with accessible headings and lists', () => {
    const { container } = render(<TermsAndConditionsPage />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const sections = termsSections.filter(({ title }) => /^\d+\./.test(title))
    expect(sections).toHaveLength(27)
    for (const [index, section] of sections.entries()) {
      expect(section.title.startsWith(`${index + 1}.`)).toBe(true)
      expect(screen.getByRole('heading', { name: section.title, level: 2 })).toBeTruthy()
    }
    expect(container.querySelectorAll('ul').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe(
      '/privacy',
    )
  })

  it('keeps alterations included and does not impose a new fixed rental deposit', () => {
    const { container } = render(<TermsAndConditionsPage />)
    const text = container.textContent ?? ''
    expect(text).toContain('Fitting and alterations are included in the purchase or rental price.')
    expect(text).toContain('The applicable amount is shown for the selected gown')
    expect(text).not.toContain('€200')
    expect(text).not.toContain('alterations are not included')
    expect(text).toContain('50% deposit')
    expect(text).toContain('statutory consumer rights')
  })

  it('provides a stable canonical and a footer link', () => {
    expect(metadata.alternates?.canonical).toBe('/terms-and-conditions')
    render(<BoutiqueFooter />)
    expect(screen.getByRole('link', { name: 'Terms & Conditions' }).getAttribute('href')).toBe(
      '/terms-and-conditions',
    )
  })
})
