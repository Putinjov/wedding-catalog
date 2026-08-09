import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

type MongoIndex = {
  key?: Record<string, unknown>
  name?: string
  unique?: boolean
}

const indexes = [
  {
    key: { idempotencyKey: 1 },
    name: 'idempotencyKey_1',
    options: { unique: true },
  },
  {
    key: { appointment: 1, createdAt: -1 },
    name: 'appointment_1_createdAt_-1',
    options: {},
  },
  {
    key: { status: 1, createdAt: 1 },
    name: 'status_1_createdAt_1',
    options: {},
  },
  {
    key: { jobId: 1 },
    name: 'jobId_1',
    options: { sparse: true },
  },
] as const

function getEmailDeliveriesModel(payload: MigrateUpArgs['payload'] | MigrateDownArgs['payload']) {
  const deliveries = payload.db.collections['email-deliveries']
  if (!deliveries) {
    throw new Error('Task 24 migration aborted: email-deliveries model is unavailable.')
  }
  return deliveries
}

function isNamespaceNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 26
}

async function getIndexes(
  model: ReturnType<typeof getEmailDeliveriesModel>,
): Promise<MongoIndex[]> {
  try {
    return (await model.collection.indexes()) as MongoIndex[]
  } catch (error) {
    if (isNamespaceNotFound(error)) return []
    throw error
  }
}

async function assertNoDuplicateIdempotencyKeys(
  model: ReturnType<typeof getEmailDeliveriesModel>,
  session: MigrateUpArgs['session'],
): Promise<void> {
  const duplicates = await model.collection
    .aggregate(
      [
        { $match: { idempotencyKey: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$idempotencyKey', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 },
      ],
      { session },
    )
    .toArray()
  if (duplicates.length > 0) {
    throw new Error('Task 24 migration aborted: duplicate email idempotency keys require manual review.')
  }
}

function hasMatchingDefinition(index: MongoIndex, definition: (typeof indexes)[number]): boolean {
  const requiresUnique =
    'unique' in definition.options && definition.options.unique === true
  return (
    Object.entries(definition.key).every(([field, direction]) => index.key?.[field] === direction) &&
    (!requiresUnique || index.unique === true)
  )
}

export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const deliveries = getEmailDeliveriesModel(payload)
  await assertNoDuplicateIdempotencyKeys(deliveries, session)
  const currentIndexes = await getIndexes(deliveries)

  for (const definition of indexes) {
    const existing = currentIndexes.find((index) => index.name === definition.name)
    if (existing) {
      if (!hasMatchingDefinition(existing, definition)) {
        throw new Error(
          `Task 24 migration aborted: ${definition.name} has an incompatible definition.`,
        )
      }
      continue
    }
    await deliveries.collection.createIndex(definition.key, {
      name: definition.name,
      ...definition.options,
    })
  }

  payload.logger.info({
    msg: 'Task 24 added durable email delivery idempotency and operational indexes.',
  })
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  const deliveries = getEmailDeliveriesModel(payload)
  const currentIndexes = await getIndexes(deliveries)
  for (const definition of indexes) {
    if (currentIndexes.some((index) => index.name === definition.name)) {
      await deliveries.collection.dropIndex(definition.name)
    }
  }

  payload.logger.info({
    msg: 'Task 24 removed email delivery indexes; delivery records were preserved for manual review.',
  })
}
