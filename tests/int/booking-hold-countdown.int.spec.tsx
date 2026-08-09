import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PaymentButton } from '@/components/booking/payment-button'

describe('booking hold countdown', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('matches the server expiry and disables payment at the exact boundary', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-01T10:00:00.000Z'))

    render(
      <PaymentButton
        amount="€20"
        expiresAt="2030-01-01T10:00:01.000Z"
        reference={`fit_${'a'.repeat(32)}`}
        serverNow="2030-01-01T10:00:00.000Z"
      />,
    )

    expect(screen.getByRole('timer').textContent).toBe('0:01')
    expect(screen.getByRole('button', { name: 'Pay €20 to confirm' }).hasAttribute('disabled')).toBe(
      false,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(screen.getByRole('status').textContent).toMatch(/hold has expired/i)
    expect(
      screen.getByRole('button', { name: 'Payment hold expired' }).hasAttribute('disabled'),
    ).toBe(true)
  })
})
