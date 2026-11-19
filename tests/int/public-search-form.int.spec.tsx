import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Search } from '@/search/Component'

const mocks = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))

afterEach(() => {
  cleanup()
  mocks.push.mockClear()
})

describe('public search form', () => {
  it('does not navigate on mount or while typing and encodes the submitted query', () => {
    render(<Search query="Grace" />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    expect(input).toHaveProperty('value', 'Grace')
    expect(mocks.push).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '  silk & lace  ' } })
    expect(mocks.push).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(mocks.push).toHaveBeenCalledWith('/search?q=silk+%26+lace')
  })

  it('skips unchanged queries and permits clearing an existing query', () => {
    render(<Search query="Grace" />)
    const button = screen.getByRole('button', { name: 'Search' })
    fireEvent.click(button)
    expect(mocks.push).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: '' } })
    fireEvent.click(button)
    expect(mocks.push).toHaveBeenCalledWith('/search')
  })
})
