import { describe, expect, it } from 'vitest'

import { getServerEnvironment } from '@/config/env'
import {
  getCanonicalOrigin,
  getServerSideOrigin,
  normalizePublicAssetOrigin,
  productionSiteOrigin,
} from '@/config/site-url'

describe('deployment configuration', () => {
  it('uses the Vercel deployment URL for previews', () => {
    const origin = getServerSideOrigin({
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'wedding-catalog-git-feature.vercel.app',
    } as NodeJS.ProcessEnv)

    expect(origin).toBe('https://wedding-catalog-git-feature.vercel.app')
  })

  it('uses the CAIT Bridal canonical origin in production', () => {
    const origin = getCanonicalOrigin({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)

    expect(origin).toBe(productionSiteOrigin)
  })

  it('normalizes an R2 public base path and trailing slash', () => {
    expect(
      normalizePublicAssetOrigin('https://media.caitbridal.ie/catalogue/', 'R2_PUBLIC_URL'),
    ).toBe('https://media.caitbridal.ie/catalogue')
  })

  it('fails fast with the exact missing production variable names', () => {
    expect(() =>
      getServerEnvironment({
        source: {
          DATABASE_URL: 'mongodb://127.0.0.1/wedding-catalog',
          NODE_ENV: 'production',
        } as NodeJS.ProcessEnv,
      }),
    ).toThrow(/R2_BUCKET.*STRIPE_SECRET_KEY/)
  })
})
