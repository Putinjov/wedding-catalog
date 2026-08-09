'use client'

import { useCallback, useState } from 'react'

import {
  getHoldRemainingMilliseconds,
  HoldCountdown,
} from '@/components/booking/hold-countdown'
import { Button } from '@/components/ui/button'

export function PaymentButton({
  amount,
  expiresAt,
  reference,
  serverNow,
}: {
  amount: string
  expiresAt: string
  reference: string
  serverNow: string
}) {
  const [error, setError] = useState('')
  const [holdExpired, setHoldExpired] = useState(
    () => getHoldRemainingMilliseconds(expiresAt, serverNow) <= 0,
  )
  const [isLoading, setIsLoading] = useState(false)
  const handleExpired = useCallback(() => setHoldExpired(true), [])

  async function handleClick() {
    if (isLoading || holdExpired) {
      return
    }

    setError('')
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        body: JSON.stringify({ reference }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result: unknown = await response.json()
      if (
        response.ok &&
        typeof result === 'object' &&
        result !== null &&
        'url' in result &&
        typeof result.url === 'string'
      ) {
        window.location.assign(result.url)
        return
      }

      const message =
        typeof result === 'object' &&
        result !== null &&
        'message' in result &&
        typeof result.message === 'string'
          ? result.message
          : 'We could not start secure payment. Please try again.'
      setError(message)
    } catch {
      setError('We could not start secure payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <HoldCountdown
        expiresAt={expiresAt}
        onExpired={handleExpired}
        serverNow={serverNow}
      />
      <Button
        className="rounded-sm"
        disabled={isLoading || holdExpired}
        onClick={handleClick}
        size="lg"
        type="button"
      >
        {holdExpired
          ? 'Payment hold expired'
          : isLoading
            ? 'Opening secure payment…'
            : `Pay ${amount} to confirm`}
      </Button>
      {error ? (
        <p aria-live="polite" className="max-w-xl text-sm leading-6 text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
