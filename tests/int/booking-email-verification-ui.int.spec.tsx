import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EmailVerificationControl } from '@/components/booking/email-verification-control'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('booking email verification control', () => {
  it('sends a link, announces status, and enables continuation only after cookie verification', async () => {
    const onVerifiedChange = vi.fn()
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Check your inbox.' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ verified: false }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ verified: true }) })
    vi.stubGlobal('fetch', fetch)

    render(<EmailVerificationControl
      email="bride@example.com"
      onVerifiedChange={onVerifiedChange}
      verified={false}
    />)
    expect(screen.getByRole('button', { name: 'Send verification link' }).className).toContain('min-h-11')
    fireEvent.click(screen.getByRole('button', { name: 'Send verification link' }))
    await screen.findByText('Check your inbox.')
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/booking/email-verification', expect.objectContaining({
      body: JSON.stringify({ email: 'bride@example.com' }),
      cache: 'no-store',
      method: 'POST',
    }))

    fireEvent.click(screen.getByRole('button', { name: 'I’ve verified my email' }))
    await screen.findByText(/Not verified yet/i)
    expect(onVerifiedChange).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: 'I’ve verified my email' }))
    await waitFor(() => expect(onVerifiedChange).toHaveBeenCalledWith(true))
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite')
  })

  it('does not keep a previous address verified after the email changes', () => {
    const onVerifiedChange = vi.fn()
    const { rerender } = render(<EmailVerificationControl
      email="first@example.com"
      onVerifiedChange={onVerifiedChange}
      verified
    />)
    expect(screen.getByText('Email verified. You can continue.')).not.toBeNull()
    rerender(<EmailVerificationControl
      email="second@example.com"
      onVerifiedChange={onVerifiedChange}
      verified={false}
    />)
    expect(screen.getByText(/Verify your email with a one-time link/i)).not.toBeNull()
  })
})
