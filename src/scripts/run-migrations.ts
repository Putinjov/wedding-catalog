import payload from 'payload'

import {
  assertMigrationDatabaseURL,
  getSafeMigrationFailure,
} from '@/lib/migrations/migrationDiagnostics'

function isNamespaceExistsError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false

  const candidate = error as { code?: unknown; codeName?: unknown }
  return candidate.code === 48 || candidate.codeName === 'NamespaceExists'
}

async function runMigrations(): Promise<void> {
  process.env.PAYLOAD_MIGRATING = 'true'
  assertMigrationDatabaseURL(process.env.DATABASE_URL)
  const { default: config } = await import('@payload-config')

  await payload.init({
    config,
    disableOnInit: true,
  })

  try {
    const migrationModel = payload.db.collections['payload-migrations']
    if (!migrationModel) {
      throw new Error('[migration-gate] Payload migration model is unavailable.')
    }

    try {
      await migrationModel.createCollection()
    } catch (error: unknown) {
      if (!isNamespaceExistsError(error)) throw error
    }

    await payload.db.migrate()
  } finally {
    await payload.destroy()
  }
}
runMigrations().catch((error: unknown) => {
  console.error(getSafeMigrationFailure(error))
  process.exitCode = 1
})
