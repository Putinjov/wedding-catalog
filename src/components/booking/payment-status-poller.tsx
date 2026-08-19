'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const DEFAULT_INTERVAL_MS = 3_000
const DEFAULT_MAX_ATTEMPTS = 60

export function PaymentStatusPoller({
  intervalMs = DEFAULT_INTERVAL_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: {
  intervalMs?: number
  maxAttempts?: number
}) {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (attempts >= maxAttempts) return

    const timer = window.setTimeout(() => {
      router.refresh()
      setAttempts((current) => current + 1)
    }, intervalMs)

    return () => window.clearTimeout(timer)
  }, [attempts, intervalMs, maxAttempts, router])

  return (
    <p aria-live="polite" className="text-sm leading-6 text-muted-foreground" role="status">
      {attempts >= maxAttempts
        ? 'Payment verification is taking longer than expected. You can safely revisit this private link later; please do not pay again.'
        : 'This page checks the verified payment status automatically. Please keep it open and do not pay again.'}
    </p>
  )
}
