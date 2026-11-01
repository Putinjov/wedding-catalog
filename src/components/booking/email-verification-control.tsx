'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  const id = useId()
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const currentEmail = useRef(email)
  useLayoutEffect(() => { currentEmail.current = email }, [email])
  const [codeValue, setCodeValue] = useState({ email, code: '' })
  const [result, setResult] = useState<{ email: string; message: string; status: VerificationStatus }>({
    email: '', message: '', status: 'idle',
  })
  const code = codeValue.email === email ? codeValue.code : ''
  const status = verified ? 'verified' : result.email === email ? result.status : 'idle'
  const busy = status === 'sending' || status === 'checking'
  const message = verified
    ? 'Email verified. You can continue.'
    : result.email === email ? result.message : ''

  async function submitVerification(action: 'send' | 'confirm') {
    const submittedEmail = email
    setResult({ email, message: '', status: action === 'send' ? 'sending' : 'checking' })
    try {
      const response = await fetch(`/api/booking/email-verification${action === 'confirm' ? '/redeem' : ''}`, {
        body: JSON.stringify(action === 'confirm' ? { email, code } : { email }),
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data: { message: string } = await response.json()
      // A response for an old address must never verify the new one.
      if (!mounted.current || currentEmail.current !== submittedEmail) return
      if (action === 'confirm') onVerifiedChange(response.ok)
      setResult({ email, message: data.message, status: !response.ok ? 'error' : action === 'confirm' ? 'verified' : 'sent' })
      if (action === 'send' && response.ok) setCodeValue({ email, code: '' })
    } catch {
      if (!mounted.current || currentEmail.current !== submittedEmail) return
      setResult({ email, message: 'Email verification is unavailable. Please try again.', status: 'error' })
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {!verified ? (
        <>
          <Button className="min-h-11" disabled={busy || !email.trim()} onClick={() => void submitVerification('send')} type="button" variant="outline">
            {status === 'sending' ? 'Sending code…' : 'Send verification code'}
          </Button>
          <div>
            <label className="text-sm font-medium" htmlFor={id}>Six-digit email code</label>
            <Input
              aria-describedby={`${id}-status`}
              autoComplete="one-time-code"
              className="mt-2 min-h-11 max-w-60"
              id={id}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCodeValue({ email, code: event.target.value.replace(/\D/g, '').slice(0, 6) })}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                if (!busy && code.length === 6) void submitVerification('confirm')
              }}
              pattern="[0-9]{6}"
              type="text"
              value={code}
            />
          </div>
          <Button className="min-h-11" disabled={busy || code.length !== 6 || !email.trim()} onClick={() => void submitVerification('confirm')} type="button" variant="outline">
            {status === 'checking' ? 'Verifying…' : 'Verify code'}
          </Button>
        </>
      ) : null}
      <p aria-live="polite" className="text-sm leading-6 text-muted-foreground" id={`${id}-status`} role="status">
        {message || 'Verify your email with a six-digit code before confirming your fitting. The code expires in 15 minutes; keep this browser open.'}
      </p>
    </div>
  )
}
