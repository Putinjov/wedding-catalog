import { describe, expect, it } from 'vitest'
import { shouldRedirectManagerToWorkspace } from '@/lib/manager/login-redirect'

describe('manager landing route', () => {
  it('redirects authenticated managers from the dashboard and login', () => {
    expect(shouldRedirectManagerToWorkspace({ role: 'manager' })).toBe(true)
    expect(shouldRedirectManagerToWorkspace({ role: 'manager' }, [])).toBe(true)
    expect(shouldRedirectManagerToWorkspace({ role: 'manager' }, ['login'])).toBe(true)
  })
  it('preserves owner, staff and unauthenticated landing behavior', () => {
    for (const user of [null, { role: 'owner' }, { role: 'staff' }, {}]) {
      expect(shouldRedirectManagerToWorkspace(user, [])).toBe(false)
      expect(shouldRedirectManagerToWorkspace(user, ['login'])).toBe(false)
    }
  })
  it('does not block existing authorized admin deep links or account routes', () => {
    for (const segments of [['collections', 'dresses'], ['account'], ['logout']]) {
      expect(shouldRedirectManagerToWorkspace({ role: 'manager' }, segments)).toBe(false)
    }
  })
})
