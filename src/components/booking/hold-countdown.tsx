'use client'

import { useEffect, useRef, useState } from 'react'

type HoldCountdownProps = {
  expiresAt: string
  onExpired?: () => void
  serverNow: string
}

export function getHoldRemainingMilliseconds(expiresAt: string, now: string | number): number {
  const expiryTime = new Date(expiresAt).getTime()
  const nowTime = typeof now === 'number' ? now : new Date(now).getTime()
  if (Number.isNaN(expiryTime) || Number.isNaN(nowTime)) return 0
  return Math.max(0, expiryTime - nowTime)
}

export function formatHoldCountdown(remainingMilliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMilliseconds / 1_000))
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  const minuteAndSeconds = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : minuteAndSeconds
}

export function HoldCountdown({ expiresAt, onExpired, serverNow }: HoldCountdownProps) {
  const [remainingMilliseconds, setRemainingMilliseconds] = useState(() =>
    getHoldRemainingMilliseconds(expiresAt, serverNow),
  )
  const announcedExpiry = useRef(false)
  const expired = remainingMilliseconds <= 0

  useEffect(() => {
    function updateRemaining() {
      const nextRemaining = getHoldRemainingMilliseconds(expiresAt, Date.now())
      setRemainingMilliseconds(nextRemaining)
      if (nextRemaining <= 0) window.clearInterval(interval)
    }

    const timeout = window.setTimeout(updateRemaining, 0)
    const interval = window.setInterval(updateRemaining, 1_000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [expiresAt])

  useEffect(() => {
    if (!expired || announcedExpiry.current) return

    announcedExpiry.current = true
    onExpired?.()
  }, [expired, onExpired])

  if (expired) {
    return (
      <p aria-live="polite" className="text-sm font-medium text-foreground" role="status">
        The payment hold has expired. This fitting time is no longer reserved.
      </p>
    )
  }

  const countdown = formatHoldCountdown(remainingMilliseconds)

  return (
    <p className="text-sm leading-6 text-muted-foreground">
      Payment hold time remaining:{' '}
      <time
        aria-label={`${countdown} remaining`}
        className="font-medium tabular-nums text-foreground"
        dateTime={expiresAt}
        role="timer"
      >
        {countdown}
      </time>
    </p>
  )
}
