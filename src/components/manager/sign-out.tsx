'use client'
import { useState } from 'react'

export function ManagerSignOut() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function signOut() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/users/logout', { method: 'POST', credentials: 'same-origin' })
      if (!response.ok) throw new Error('Unable to sign out. Please try again.')
      window.location.assign('/admin/login')
    } catch {
      setError('Unable to sign out. Please try again.')
      setBusy(false)
    }
  }
  return <div><button className="manager-action" disabled={busy} onClick={() => void signOut()}>Sign out</button>{error && <p role="alert">{error}</p>}</div>
}
