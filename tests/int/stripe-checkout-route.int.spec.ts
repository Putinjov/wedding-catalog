import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createFittingCheckoutSession: vi.fn(),
}))

vi.mock('@/lib/stripe/createFittingCheckoutSession', () => ({
  createFittingCheckoutSession: mocks.createFittingCheckoutSession,
}))

import { POST } from '@/app/(frontend)/api/stripe/create-checkout-session/route'

describe('Stripe Checkout route', () => {
  const reference = `fit_${'b'.repeat(32)}`

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the Stripe-hosted redirect for a valid fitting', async () => {
    mocks.createFittingCheckoutSession.mockResolvedValue({
      status: 'redirect',
      url: 'https://checkout.stripe.com/c/pay/test',
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout-session', {
        body: JSON.stringify({ reference }),
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.10' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: 'https://checkout.stripe.com/c/pay/test',
    })
  })

  it('does not create Checkout for an unavailable fitting', async () => {
    mocks.createFittingCheckoutSession.mockResolvedValue({
      message: 'This fitting time is no longer available.',
      status: 'unavailable',
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/create-checkout-session', {
        body: JSON.stringify({ reference }),
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.11' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(409)
  })
})
