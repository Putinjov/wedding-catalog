import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { getServerEnvironment } from '@/config/env'
import { findPendingMigrationNames, isMigrationGateRequired } from '@/config/migration-gate'
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
    ).toThrow(/EMAIL_FROM.*SMTP_PASSWORD.*STRIPE_SECRET_KEY/)
  })

  it('supports a verified Google Workspace sender alias', () => {
    const environment = getServerEnvironment({
      source: {
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
      } as NodeJS.ProcessEnv,
    })

    expect(environment.SMTP_USER).toBe('sales@caitbridal.ie')
    expect(environment.EMAIL_FROM).toBe('noreply@caitbridal.ie')
  })

  it('rejects an unapproved Google Workspace sender alias', () => {
    expect(() =>
      getServerEnvironment({
        source: {
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
        } as NodeJS.ProcessEnv,
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
    expect(payloadConfig).toContain("autoIndex: process.env.PAYLOAD_MIGRATING !== 'true'")
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
