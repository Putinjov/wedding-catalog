import payload, { getMigrations, readMigrationFiles } from 'payload'

import { assertPersistedUserRoles, findPendingMigrationNames, isMigrationGateRequired } from '@/config/migration-gate'

async function checkPendingMigrations(): Promise<void> {
  if (!isMigrationGateRequired()) {
    console.info('[migration-gate] Check skipped outside a production deployment.')
    return
  }

  // Keep this status check read-only by disabling Mongoose auto-index creation
  // before Payload config and the database adapter are initialized.
  process.env.PAYLOAD_MIGRATING = 'true'
  const { default: config } = await import('@payload-config')

  await payload.init({
    config,
    disableOnInit: true,
  })

  try {
    const [migrationFiles, { existingMigrations }] = await Promise.all([
      readMigrationFiles({ payload }),
      getMigrations({ payload }),
    ])
    const pendingNames = findPendingMigrationNames(
      migrationFiles.map(({ name }) => name),
      existingMigrations.map(({ name }) => name),
    )

    if (pendingNames.length > 0) {
      throw new Error(
        `[migration-gate] Production build blocked. Pending migrations: ${pendingNames.join(', ')}.`,
      )
    }

    const users = payload.db.collections.users
    if (!users) throw new Error('[migration-gate] Users model unavailable.')
    const [totalUsers, owners, invalidRoles] = await Promise.all([
      users.collection.countDocuments({}),
      users.collection.countDocuments({ role: 'owner' }),
      users.collection.countDocuments({ role: { $nin: ['owner', 'manager', 'staff'] } }),
    ])
    assertPersistedUserRoles({ totalUsers, owners, invalidRoles })

    console.info(`[migration-gate] Verified ${migrationFiles.length} applied migration(s).`)
  } finally {
    await payload.destroy()
  }
}

checkPendingMigrations().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.name : 'UnknownError'
  const safeMessage =
    error instanceof Error && error.message.startsWith('[migration-gate]')
      ? error.message
      : `[migration-gate] Unable to verify production migration state (${errorName}).`

  console.error(safeMessage)
  process.exitCode = 1
})
