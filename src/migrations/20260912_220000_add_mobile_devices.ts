import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

type MongoIndex = {
  key?: Record<string, unknown>
  name?: string
  unique?: boolean
}

const indexes = [
  {
    key: { expoPushToken: 1 },
    name: 'expoPushToken_1',
    options: { unique: true },
  },
  {
    key: { notificationsEnabled: 1, lastSeenAt: -1 },
    name: 'notificationsEnabled_1_lastSeenAt_-1',
    options: {},
  },
  {
    key: { user: 1, lastSeenAt: -1 },
    name: 'user_1_lastSeenAt_-1',
    options: {},
  },
] as const

function getMobileDevicesModel(payload: MigrateUpArgs['payload'] | MigrateDownArgs['payload']) {
  const devices = payload.db.collections['mobile-devices']
  if (!devices) {
    throw new Error('[migration-gate] Mobile device registration model is unavailable.')
  }
  return devices
}

function isNamespaceNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 26
}

async function getIndexes(
  model: ReturnType<typeof getMobileDevicesModel>,
): Promise<MongoIndex[]> {
  try {
    return (await model.collection.indexes()) as MongoIndex[]
  } catch (error) {
    if (isNamespaceNotFound(error)) return []
    throw error
  }
}

function hasMatchingDefinition(
  index: MongoIndex,
  definition: (typeof indexes)[number],
): boolean {
  const actual = Object.entries(index.key ?? {})
  const expected = Object.entries(definition.key)
  const keyMatches =
    actual.length === expected.length &&
    expected.every(
      ([field, direction], position) =>
        actual[position]?.[0] === field && actual[position]?.[1] === direction,
    )
  const needsUnique = 'unique' in definition.options && definition.options.unique === true
  return keyMatches && (!needsUnique || index.unique === true)
}

async function assertUniqueTokens(
  model: ReturnType<typeof getMobileDevicesModel>,
): Promise<void> {
  const duplicates = await model.collection
    .aggregate([
      { $match: { expoPushToken: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$expoPushToken', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray()
  if (duplicates.length > 0) {
    throw new Error(
      '[migration-gate] Duplicate mobile push tokens require manual review before migration.',
    )
  }
}

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const devices = getMobileDevicesModel(payload)
  await assertUniqueTokens(devices)
  const currentIndexes = await getIndexes(devices)

  for (const definition of indexes) {
    const existing = currentIndexes.find((index) => index.name === definition.name)
    if (existing) {
      if (!hasMatchingDefinition(existing, definition)) {
        throw new Error(
          `[migration-gate] ${definition.name} has an incompatible definition.`,
        )
      }
      continue
    }
    await devices.collection.createIndex(definition.key, {
      name: definition.name,
      ...definition.options,
    })
  }

  payload.logger.info({ msg: 'Added mobile manager device registration indexes.' })
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  const devices = getMobileDevicesModel(payload)
  const currentIndexes = await getIndexes(devices)
  for (const definition of indexes) {
    if (currentIndexes.some((index) => index.name === definition.name)) {
      await devices.collection.dropIndex(definition.name)
    }
  }
  payload.logger.info({
    msg: 'Removed mobile device indexes; registration records were preserved for manual review.',
  })
}
