'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

export function EmailVerificationPage() {
  const [token, setToken] = useState<string | null>(null)
  const [state, setState] = useState<'ready' | 'submitting' | 'success' | 'error'>('ready')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const fragment = new URLSearchParams(window.location.hash.slice(1))
      setToken(fragment.get('token') ?? '')
      window.history.replaceState(null, '', window.location.pathname)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  async function confirm() {
    setState('submitting')
    try {
      const response = await fetch('/api/booking/email-verification/redeem', {
        body: JSON.stringify({ token }),
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result: { message: string } = await response.json()
      setState(response.ok ? 'success' : 'error')
      setMessage(result.message)
    } catch {
      setState('error')
      setMessage('Email verification is temporarily unavailable. Please try again.')
    }
  }

  return (
    <main className="container max-w-2xl px-4 py-20">
      <h1 className="font-serif text-4xl text-foreground">Confirm your email</h1>
      <p className="mt-5 leading-7 text-muted-foreground">
        Confirm that you own this email address before booking your private fitting.
      </p>
      {state === 'success' ? (
        <>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Enter this same email address in the booking form to continue.
          </p>
          <Link className="mt-8 inline-flex min-h-11 items-center underline underline-offset-4" href="/book-a-fitting">
            Return to booking
          </Link>
        </>
      ) : (
        <Button className="mt-8 min-h-11" disabled={!token || state === 'submitting'} onClick={confirm} type="button">
          {state === 'submitting' ? 'Confirming…' : 'Confirm email'}
        </Button>
      )}
      <p aria-live="polite" className="mt-4 text-sm text-muted-foreground" role="status">
        {message || (token === '' ? 'This verification link is invalid. Request a new link from the booking form.' : '')}
      </p>
    </main>
  )
}
