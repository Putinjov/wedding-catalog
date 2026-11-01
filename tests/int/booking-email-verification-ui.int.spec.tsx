import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EmailVerificationControl } from '@/components/booking/email-verification-control'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('booking email verification control', () => {
  it('sends a code and enables continuation only after server verification', async () => {
    const onVerifiedChange = vi.fn()
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Check your inbox.' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'The code is incorrect.' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Email verified.' }) })
    vi.stubGlobal('fetch', fetch)

    render(<EmailVerificationControl
      email="bride@example.com"
      onVerifiedChange={onVerifiedChange}
      verified={false}
    />)
    expect(screen.getByRole('button', { name: 'Send verification code' }).className).toContain('min-h-11')
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }))
    await screen.findByText('Check your inbox.')
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/booking/email-verification', expect.objectContaining({
      body: JSON.stringify({ email: 'bride@example.com' }),
      cache: 'no-store',
      method: 'POST',
    }))

    const code = screen.getByLabelText('Six-digit email code')
    expect(code.getAttribute('autocomplete')).toBe('one-time-code')
    expect(code.getAttribute('inputmode')).toBe('numeric')
    fireEvent.change(code, { target: { value: '001234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }))
    await screen.findByText('The code is incorrect.')
    expect(onVerifiedChange).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }))
    await waitFor(() => expect(onVerifiedChange).toHaveBeenCalledWith(true))
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite')
    expect(fetch).toHaveBeenLastCalledWith('/api/booking/email-verification/redeem', expect.objectContaining({
      body: JSON.stringify({ email: 'bride@example.com', code: '001234' }), cache: 'no-store',
    }))
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
    expect(screen.getByText(/Verify your email with a six-digit code/i)).not.toBeNull()
  })

  it('ignores an in-flight confirmation after the email changes', async () => {
    let complete!: (value: { ok: boolean; json: () => Promise<{ message: string }> }) => void
    const response = new Promise<{ ok: boolean; json: () => Promise<{ message: string }> }>((resolve) => { complete = resolve })
    vi.stubGlobal('fetch', vi.fn(() => response))
    const onVerifiedChange = vi.fn()
    const { rerender } = render(<EmailVerificationControl email="first@example.com" onVerifiedChange={onVerifiedChange} verified={false} />)
    fireEvent.change(screen.getByLabelText('Six-digit email code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }))
    rerender(<EmailVerificationControl email="second@example.com" onVerifiedChange={onVerifiedChange} verified={false} />)
    await act(async () => { complete({ ok: true, json: async () => ({ message: 'Email verified.' }) }) })
    expect(onVerifiedChange).not.toHaveBeenCalled()
    expect((screen.getByLabelText('Six-digit email code') as HTMLInputElement).value).toBe('')
  })
})
