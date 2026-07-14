'use client'

import React, { createContext, useCallback, use, useState } from 'react'

import type { Theme, ThemeContextType } from './types'

import canUseDOM from '@/utilities/canUseDOM'
import { defaultTheme, getImplicitPreference, themeLocalStorageKey } from './shared'
import { themeIsValid } from './types'

const initialContext: ThemeContextType = {
  setTheme: () => null,
  theme: undefined,
}

const ThemeContext = createContext(initialContext)

const getInitialTheme = (): Theme | undefined => {
  if (!canUseDOM) {
    return undefined
  }

  const preference = window.localStorage.getItem(themeLocalStorageKey)

  if (themeIsValid(preference)) {
    return preference
  }

  return (
    (document.documentElement.getAttribute('data-theme') as Theme | null) ||
    getImplicitPreference() ||
    defaultTheme
  )
}

const setThemeCookie = (themeToSet: Theme | null) => {
  const maxAge = themeToSet === null ? 0 : 60 * 60 * 24 * 365

  document.cookie = `${themeLocalStorageKey}=${themeToSet ?? ''}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme | undefined>(getInitialTheme)

  const setTheme = useCallback((themeToSet: Theme | null) => {
    if (themeToSet === null) {
      window.localStorage.removeItem(themeLocalStorageKey)
      setThemeCookie(null)
      const implicitPreference = getImplicitPreference()
      document.documentElement.setAttribute('data-theme', implicitPreference || '')
      if (implicitPreference) setThemeState(implicitPreference)
    } else {
      setThemeState(themeToSet)
      window.localStorage.setItem(themeLocalStorageKey, themeToSet)
      setThemeCookie(themeToSet)
      document.documentElement.setAttribute('data-theme', themeToSet)
    }
  }, [])

  return <ThemeContext value={{ setTheme, theme }}>{children}</ThemeContext>
}

export const useTheme = (): ThemeContextType => use(ThemeContext)
