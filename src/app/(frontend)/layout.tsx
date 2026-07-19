import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { AnnouncementBar } from '@/components/boutique/announcement-bar'
import { BoutiqueFooter } from '@/components/boutique/boutique-footer'
import { BoutiqueHeader } from '@/components/boutique/boutique-header'
import { siteConfig } from '@/config/site'
import { getCanonicalOrigin } from '@/config/site-url'
import { Providers } from '@/providers'
import { defaultTheme, themeLocalStorageKey } from '@/providers/Theme/shared'
import { themeIsValid } from '@/providers/Theme/types'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { cookies, draftMode } from 'next/headers'

import './globals.css'

const sans = Inter({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-body-sans',
})

const serif = Cormorant_Garamond({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-editorial-serif',
  weight: ['400', '500', '600'],
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const cookieStore = await cookies()
  const themePreference = cookieStore.get(themeLocalStorageKey)?.value
  const initialTheme = themeIsValid(themePreference ?? null) ? themePreference : defaultTheme

  return (
    <html
      className={cn(sans.variable, serif.variable)}
      data-theme={initialTheme}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <AnnouncementBar />
          <BoutiqueHeader />
          {children}
          <BoutiqueFooter />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.tagline,
  metadataBase: new URL(getCanonicalOrigin()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
  },
}
