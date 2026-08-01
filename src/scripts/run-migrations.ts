import payload from 'payload'

function isNamespaceExistsError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false

  const candidate = error as { code?: unknown; codeName?: unknown }
  return candidate.code === 48 || candidate.codeName === 'NamespaceExists'
}

async function runMigrations(): Promise<void> {
  process.env.PAYLOAD_MIGRATING = 'true'
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
  const errorName = error instanceof Error ? error.name : 'UnknownError'
  const safeMessage =
    error instanceof Error && error.message.startsWith('[migration-gate]')
      ? error.message
      : `[migration-gate] Production migration failed (${errorName}).`

  console.error(safeMessage)
  process.exitCode = 1
})
