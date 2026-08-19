import { describe, expect, it } from 'vitest'

import {
  assertMigrationDatabaseURL,
  getSafeMigrationFailure,
} from '@/lib/migrations/migrationDiagnostics'

describe('production migration diagnostics', () => {
  it('accepts MongoDB connection URI schemes without logging their contents', () => {
    expect(() => assertMigrationDatabaseURL('mongodb://user:pass@example.test/catalogue')).not.toThrow()
    expect(() =>
      assertMigrationDatabaseURL('mongodb+srv://user:pass@example.test/catalogue'),
    ).not.toThrow()
  })

  it('fails safely for missing, placeholder, malformed, and whitespace-wrapped values', () => {
    expect(() => assertMigrationDatabaseURL(undefined)).toThrow(
      '[migration-gate] DATABASE_URL is missing.',
    )
    expect(() => assertMigrationDatabaseURL('vercel_sensitive_value')).toThrow(
      /not a valid MongoDB connection URI/,
    )
    expect(() => assertMigrationDatabaseURL('https://example.test/database')).toThrow(
      /not a valid MongoDB connection URI/,
    )
    expect(() =>
      assertMigrationDatabaseURL(' mongodb+srv://user:pass@example.test/catalogue'),
    ).toThrow(/unsupported whitespace/)
  })

  it('preserves bounded migration-gate messages but rejects messages containing URLs', () => {
    expect(
      getSafeMigrationFailure(new Error('[migration-gate] Task 25 aborted: manual review required.')),
    ).toBe('[migration-gate] Task 25 aborted: manual review required.')
    expect(
      getSafeMigrationFailure(
        new Error('[migration-gate] Failure at mongodb+srv://user:secret@example.test/catalogue'),
      ),
    ).toBe('[migration-gate] Production migration failed (Error).')
  })

  it('classifies production environment validation failures without exposing raw values', () => {
    expect(
      getSafeMigrationFailure(
        new Error('[env] Missing required production variables: SMTP_PASSWORD, R2_SECRET_ACCESS_KEY.'),
      ),
    ).toBe(
      '[migration-gate] Production environment is incomplete; verify required GitHub production secrets.',
    )
    expect(
      getSafeMigrationFailure(
        new Error('[env] Invalid server environment: SMTP_USER: Invalid email address.'),
      ),
    ).toBe(
      '[migration-gate] Production environment contains an invalid value; verify GitHub production secrets.',
    )
    expect(
      getSafeMigrationFailure(
        new Error('[env] EMAIL_FROM must be the verified Google Workspace alias secret@example.test.'),
      ),
    ).toBe(
      '[migration-gate] EMAIL_FROM does not match the expected verified Google Workspace alias.',
    )
    expect(
      getSafeMigrationFailure(
        new Error('[env] NEXT_PUBLIC_SERVER_URL must be https://secret.example.test in production.'),
      ),
    ).toBe('[migration-gate] NEXT_PUBLIC_SERVER_URL does not match the production site origin.')
  })

  it('classifies known secret-length and URL validation failures', () => {
    expect(
      getSafeMigrationFailure(
        new Error('[env] PAYLOAD_SECRET must be at least 32 characters in production.'),
      ),
    ).toBe('[migration-gate] PAYLOAD_SECRET is too short; update the GitHub production secret.')
    expect(
      getSafeMigrationFailure(
        new Error('[env] SMTP_PASSWORD must be at least 16 characters in production.'),
      ),
    ).toBe('[migration-gate] SMTP_PASSWORD is too short; update the GitHub production secret.')
    expect(
      getSafeMigrationFailure(new Error('[env] R2_ENDPOINT must be an absolute http(s) URL.')),
    ).toBe('[migration-gate] R2_ENDPOINT is invalid; verify the GitHub production secret.')
    expect(
      getSafeMigrationFailure(
        new Error('[env] R2_PUBLIC_URL must be a public http(s) URL without credentials, query or hash.'),
      ),
    ).toBe('[migration-gate] R2_PUBLIC_URL is invalid; verify the GitHub production secret.')
  })

  it('fails closed for unknown environment errors and never logs their raw contents', () => {
    const result = getSafeMigrationFailure(
      new Error(
        '[env] FUTURE_SECRET rejected mongodb+srv://user:secret@example.test/catalogue and hidden-value',
      ),
    )

    expect(result).toBe(
      '[migration-gate] Production environment validation failed; verify GitHub production secrets.',
    )
    expect(result).not.toContain('secret@example.test')
    expect(result).not.toContain('hidden-value')
    expect(result).not.toContain('mongodb+srv://')
  })

  it('classifies nested authentication errors without exposing driver details', () => {
    const error = Object.assign(new Error('connection failed for user@example.test'), {
      cause: { code: 8000, message: 'bad auth: secret-value' },
      name: 'MongoServerSelectionError',
    })

    const result = getSafeMigrationFailure(error)

    expect(result).toBe(
      '[migration-gate] MongoDB authentication failed; verify the database user credentials.',
    )
    expect(result).not.toContain('secret-value')
    expect(result).not.toContain('example.test')
  })

  it('classifies DNS, TLS, network, server-selection, parsing, and transaction failures', () => {
    expect(getSafeMigrationFailure({ cause: { code: 'ENOTFOUND' } })).toMatch(/DNS resolution/)
    expect(getSafeMigrationFailure({ cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' } })).toMatch(
      /TLS negotiation/,
    )
    expect(getSafeMigrationFailure({ name: 'MongoNetworkTimeoutError' })).toMatch(
      /network connection/,
    )
    expect(getSafeMigrationFailure({ name: 'MongooseServerSelectionError' })).toMatch(
      /server selection/,
    )
    expect(getSafeMigrationFailure({ name: 'MongoParseError' })).toMatch(/URI parsing/)
    expect(getSafeMigrationFailure({ code: 251 })).toMatch(/transaction support/)
  })

  it('bounds unknown error names and never includes raw messages or stacks', () => {
    const error = new Error('mongodb+srv://user:secret@example.test/catalogue')
    error.name = 'Error secret@example.test'
    error.stack = 'stack containing another-secret'

    const result = getSafeMigrationFailure(error)

    expect(result).toBe('[migration-gate] Production migration failed (UnknownError).')
    expect(result).not.toContain('secret')
    expect(result).not.toContain('stack')
  })
})
