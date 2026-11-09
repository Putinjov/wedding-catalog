import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import localFont from 'next/font/local'
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

const sans = localFont({
  src: '../../assets/fonts/InterVariable.woff2',
  display: 'swap',
  style: 'normal',
  variable: '--font-body-sans',
  weight: '100 900',
})

const serif = localFont({
  src: [
    { path: '../../assets/fonts/CormorantGaramond-Regular.woff2', weight: '400' },
    { path: '../../assets/fonts/CormorantGaramond-Medium.woff2', weight: '500' },
    { path: '../../assets/fonts/CormorantGaramond-SemiBold.woff2', weight: '600' },
  ],
  adjustFontFallback: 'Times New Roman',
  display: 'swap',
  style: 'normal',
  variable: '--font-editorial-serif',
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
