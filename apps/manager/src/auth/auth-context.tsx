import * as SecureStore from 'expo-secure-store'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ApiError,
  type AuthSession,
  login as loginRequest,
  refreshSession,
} from '@/lib/api'

const sessionKey = 'cait-bridal-manager-session'

type AuthContextValue = {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  session: AuthSession | null
  status: 'authenticated' | 'guest' | 'loading'
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isStoredSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Record<string, unknown>
  const user = session.user
  return (
    typeof session.token === 'string' &&
    typeof user === 'object' &&
    user !== null &&
    'email' in user &&
    typeof user.email === 'string'
  )
}

async function persistSession(session: AuthSession | null): Promise<void> {
  if (session) {
    await SecureStore.setItemAsync(sessionKey, JSON.stringify(session))
  } else {
    await SecureStore.deleteItemAsync(sessionKey)
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')

  useEffect(() => {
    let active = true
    async function restore() {
      try {
        const stored = await SecureStore.getItemAsync(sessionKey)
        const parsed: unknown = stored ? JSON.parse(stored) : null
        if (!isStoredSession(parsed)) {
          if (active) setStatus('guest')
          return
        }
        try {
          const refreshed = await refreshSession(parsed.token)
          await persistSession(refreshed)
          if (active) {
            setSession(refreshed)
            setStatus('authenticated')
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await persistSession(null)
            if (active) setStatus('guest')
            return
          }
          if (active) {
            setSession(parsed)
            setStatus('authenticated')
          }
        }
      } catch {
        await persistSession(null)
        if (active) setStatus('guest')
      }
    }
    void restore()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginRequest(email, password)
    await persistSession(next)
    setSession(next)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await persistSession(null)
    setSession(null)
    setStatus('guest')
  }, [])

  const value = useMemo(
    () => ({ login, logout, session, status }),
    [login, logout, session, status],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
