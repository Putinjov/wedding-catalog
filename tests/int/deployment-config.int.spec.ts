import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { getAllowedDevOrigins } from '@/config/dev-origins'
import { getServerEnvironment } from '@/config/env'
import { findPendingMigrationNames, isMigrationGateRequired } from '@/config/migration-gate'
import {
  getCanonicalOrigin,
  getServerSideOrigin,
  normalizePublicAssetOrigin,
  productionSiteOrigin,
} from '@/config/site-url'

function environmentFixture(overrides: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return {
    CRON_SECRET: '',
    DATABASE_URL: '',
    NEXT_PUBLIC_SERVER_URL: '',
    NODE_ENV: 'test',
    PAYLOAD_SECRET: '',
    PREVIEW_SECRET: '',
    R2_ACCESS_KEY_ID: '',
    R2_BUCKET: '',
    R2_ENDPOINT: '',
    R2_PUBLIC_URL: '',
    R2_SECRET_ACCESS_KEY: '',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    VERCEL_PROJECT_PRODUCTION_URL: '',
    ...overrides,
  }
}

describe('deployment configuration', () => {
  it('allows explicitly configured LAN hosts only in development', () => {
    expect(
      getAllowedDevOrigins(environmentFixture({
        ALLOWED_DEV_ORIGINS: '192.168.1.12, http://Bridal-Test.local:3000, 192.168.1.12',
        NODE_ENV: 'development',
      })),
    ).toEqual(['192.168.1.12', 'bridal-test.local'])

    expect(
      getAllowedDevOrigins(environmentFixture({
        ALLOWED_DEV_ORIGINS: '192.168.1.12',
        NODE_ENV: 'production',
      })),
    ).toBeUndefined()
  })

  it('uses the Vercel deployment URL for previews', () => {
    const origin = getServerSideOrigin(environmentFixture({
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'wedding-catalog-git-feature.vercel.app',
    }))

    expect(origin).toBe('https://wedding-catalog-git-feature.vercel.app')
  })

  it('uses the CAIT Bridal canonical origin in production', () => {
    const origin = getCanonicalOrigin(environmentFixture({ NODE_ENV: 'production' }))

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
        source: environmentFixture({
          DATABASE_URL: 'mongodb://127.0.0.1/wedding-catalog',
          NODE_ENV: 'production',
        }),
      }),
    ).toThrow(/EMAIL_FROM.*SMTP_PASSWORD.*STRIPE_SECRET_KEY/)
  })

  it('supports a verified Google Workspace sender alias', () => {
    const environment = getServerEnvironment({
      source: environmentFixture({
        BOOKING_ADMIN_EMAIL: 'bookings@caitbridal.ie',
        CRON_SECRET: 'cron-secret-at-least-24-characters',
        DATABASE_URL: 'mongodb://127.0.0.1/wedding-catalog',
        EMAIL_FROM: 'noreply@caitbridal.ie',
        EMAIL_REPLY_TO: 'bookings@caitbridal.ie',
        NEXT_PUBLIC_SERVER_URL: 'https://caitbridal.ie',
        NODE_ENV: 'production',
        PAYLOAD_SECRET: 'payload-secret-at-least-32-characters',
        PREVIEW_SECRET: 'preview-secret-at-least-24-characters',
        R2_ACCESS_KEY_ID: 'key',
        R2_BUCKET: 'bucket',
        R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
        R2_PUBLIC_URL: 'https://media.caitbridal.ie',
        R2_SECRET_ACCESS_KEY: 'secret',
        SMTP_PASSWORD: 'smtp-password-at-least-16-characters',
        SMTP_USER: 'sales@caitbridal.ie',
        STRIPE_SECRET_KEY: 'sk_test_placeholder',
        STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
      }),
    })

    expect(environment.SMTP_USER).toBe('sales@caitbridal.ie')
    expect(environment.EMAIL_FROM).toBe('noreply@caitbridal.ie')
  })

  it('rejects an unapproved Google Workspace sender alias', () => {
    expect(() =>
      getServerEnvironment({
        source: environmentFixture({
          BOOKING_ADMIN_EMAIL: 'bookings@caitbridal.ie',
          CRON_SECRET: 'cron-secret-at-least-24-characters',
          DATABASE_URL: 'mongodb://127.0.0.1/wedding-catalog',
          EMAIL_FROM: 'other@caitbridal.ie',
          EMAIL_REPLY_TO: 'bookings@caitbridal.ie',
          NEXT_PUBLIC_SERVER_URL: 'https://caitbridal.ie',
          NODE_ENV: 'production',
          PAYLOAD_SECRET: 'payload-secret-at-least-32-characters',
          PREVIEW_SECRET: 'preview-secret-at-least-24-characters',
          R2_ACCESS_KEY_ID: 'key',
          R2_BUCKET: 'bucket',
          R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
          R2_PUBLIC_URL: 'https://media.caitbridal.ie',
          R2_SECRET_ACCESS_KEY: 'secret',
          SMTP_PASSWORD: 'smtp-password-at-least-16-characters',
          SMTP_USER: 'sales@caitbridal.ie',
          STRIPE_SECRET_KEY: 'sk_test_placeholder',
          STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
        }),
      }),
    ).toThrow('EMAIL_FROM must be the verified Google Workspace alias noreply@caitbridal.ie')
  })

  it('requires the migration gate for Vercel production and explicit non-Vercel builds', () => {
    expect(isMigrationGateRequired({ VERCEL_ENV: 'production' })).toBe(true)
    expect(isMigrationGateRequired({ MIGRATION_GATE_REQUIRED: 'true' })).toBe(true)
    expect(
      isMigrationGateRequired({ MIGRATION_GATE_REQUIRED: 'false', VERCEL_ENV: 'production' }),
    ).toBe(true)
    expect(isMigrationGateRequired({ VERCEL_ENV: 'preview' })).toBe(false)
    expect(() => isMigrationGateRequired({ MIGRATION_GATE_REQUIRED: 'yes' })).toThrow(
      'must be true or false',
    )
  })

  it('finds pending migrations and rejects duplicate filenames', () => {
    expect(findPendingMigrationNames(['one', 'two', 'three'], ['one', 'three'])).toEqual(['two'])
    expect(() => findPendingMigrationNames(['one', 'one'], [])).toThrow(
      'Duplicate migration filenames',
    )
  })

  it('keeps migrations out of runtime startup and wires a serialized production gate', () => {
    const packageConfig = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> }
    const payloadConfig = readFileSync(resolve(process.cwd(), 'src/payload.config.ts'), 'utf8')
    const workflow = readFileSync(
      resolve(process.cwd(), '.github/workflows/production-migrations.yml'),
      'utf8',
    )
    const migrationRunner = readFileSync(
      resolve(process.cwd(), 'src/scripts/run-migrations.ts'),
      'utf8',
    )

    expect(packageConfig.scripts.build).toMatch(/^npm run migrations:check/)
    expect(packageConfig.scripts['migrations:run']).toContain('src/scripts/run-migrations.ts')
    expect(payloadConfig).not.toContain('prodMigrations')
    expect(payloadConfig).toContain("process.env.NODE_ENV !== 'production'")
    expect(payloadConfig).toContain("process.env.PAYLOAD_MIGRATING !== 'true'")
    expect(migrationRunner).toContain('disableOnInit: true')
    expect(migrationRunner.indexOf('createCollection()')).toBeLessThan(
      migrationRunner.indexOf('payload.db.migrate()'),
    )
    expect(workflow).toContain('group: production-database-migrations')
    expect(workflow).toContain('cancel-in-progress: false')
    expect(workflow).toContain('name: production')
    expect(workflow).toContain('ref: ${{ github.event.repository.default_branch }}')
    expect(workflow).toContain('npm run migrations:run')
    expect(workflow).toContain('npm run migrations:check')
  })
})
