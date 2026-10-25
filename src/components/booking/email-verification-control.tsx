'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

type VerificationStatus = 'idle' | 'sending' | 'sent' | 'checking' | 'verified' | 'error'

export function EmailVerificationControl({
  email,
  onVerifiedChange,
  verified,
}: {
  email: string
  onVerifiedChange: (verified: boolean) => void
  verified: boolean
}) {
  const [result, setResult] = useState<{ email: string; message: string; status: VerificationStatus }>({
    email: '', message: '', status: 'idle',
  })
  const status = verified ? 'verified' : result.email === email ? result.status : 'idle'
  const message = verified
    ? 'Email verified. You can continue.'
    : result.email === email ? result.message : ''

  const checkStatus = useCallback(async () => {
    if (!email.trim()) return
    setResult({ email, message: '', status: 'checking' })
    try {
      const response = await fetch('/api/booking/email-verification/status', {
        body: JSON.stringify({ email }),
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!response.ok) throw new Error('Verification status unavailable.')
      const result: { verified: boolean } = await response.json()
      onVerifiedChange(result.verified)
      setResult({
        email,
        message: result.verified
          ? 'Email verified. You can continue.'
          : 'Not verified yet. Open the link in your email, then check again.',
        status: result.verified ? 'verified' : 'sent',
      })
    } catch {
      setResult({ email, message: 'We could not check your email status. Please try again.', status: 'error' })
    }
  }, [email, onVerifiedChange])

  useEffect(() => {
    if (status !== 'sent') return
    const onFocus = () => void checkStatus()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [checkStatus, status])

  async function sendLink() {
    setResult({ email, message: '', status: 'sending' })
    try {
      const response = await fetch('/api/booking/email-verification', {
        body: JSON.stringify({ email }),
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result: { message: string } = await response.json()
      setResult({ email, message: result.message, status: response.ok ? 'sent' : 'error' })
    } catch {
      setResult({ email, message: 'We could not send a link right now. Please try again.', status: 'error' })
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11" disabled={verified || status === 'sending' || !email.trim()} onClick={sendLink} type="button" variant="outline">
          {status === 'sending' ? 'Sending link…' : 'Send verification link'}
        </Button>
        {!verified ? (
          <Button className="min-h-11" disabled={status === 'checking' || !email.trim()} onClick={checkStatus} type="button" variant="outline">
            {status === 'checking' ? 'Checking…' : 'I’ve verified my email'}
          </Button>
        ) : null}
      </div>
      <p aria-live="polite" className="text-sm leading-6 text-muted-foreground" role="status">
        {message || 'Verify your email with a one-time link before confirming your fitting.'}
      </p>
    </div>
  )
}
