import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

type MongoIndex = {
  key?: Record<string, unknown>
  name?: string
  sparse?: boolean
  unique?: boolean
}

const appointmentIndexes = [
  { field: 'stripePaymentIntentId', name: 'stripePaymentIntentId_1' },
  { field: 'stripeRefundId', name: 'stripeRefundId_1' },
] as const
const auditIndex = { field: 'idempotencyKey', name: 'idempotencyKey_1' } as const

function getModels(payload: MigrateUpArgs['payload'] | MigrateDownArgs['payload']) {
  const appointments = payload.db.collections.appointments
  const audits = payload.db.collections['appointment-audits']
  if (!appointments || !audits) {
    throw new Error('Task 23 migration aborted: appointment models are unavailable.')
  }
  return { appointments, audits }
}

function isNamespaceNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 26
}

async function getIndexes(
  model: ReturnType<typeof getModels>['appointments'],
): Promise<MongoIndex[]> {
  try {
    return (await model.collection.indexes()) as MongoIndex[]
  } catch (error) {
    if (isNamespaceNotFound(error)) return []
    throw error
  }
}

async function assertNoDuplicates(
  model: ReturnType<typeof getModels>['appointments'],
  field: string,
  session: MigrateUpArgs['session'],
): Promise<void> {
  const duplicates = await model.collection
    .aggregate(
      [
        { $match: { [field]: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 },
      ],
      { session },
    )
    .toArray()
  if (duplicates.length > 0) {
    throw new Error(`Task 23 migration aborted: duplicate ${field} values require manual review.`)
  }
}

async function ensureSparseUniqueIndex(
  model: ReturnType<typeof getModels>['appointments'],
  field: string,
  name: string,
): Promise<void> {
  const indexes = await getIndexes(model)
  const existing = indexes.find(
    (index) => index.name === name || index.key?.[field] === 1,
  )
  if (existing) {
    if (existing.key?.[field] !== 1 || existing.unique !== true || existing.sparse !== true) {
      throw new Error(`Task 23 migration aborted: ${name} has an incompatible definition.`)
    }
    return
  }
  await model.collection.createIndex(
    { [field]: 1 },
    { name, sparse: true, unique: true },
  )
}

export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const { appointments, audits } = getModels(payload)
  for (const index of appointmentIndexes) {
    await assertNoDuplicates(appointments, index.field, session)
    await ensureSparseUniqueIndex(appointments, index.field, index.name)
  }
  await assertNoDuplicates(audits, auditIndex.field, session)
  await ensureSparseUniqueIndex(audits, auditIndex.field, auditIndex.name)

  payload.logger.info({
    msg: 'Task 23 added paid-conflict refund and operation idempotency indexes.',
  })
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  const { appointments, audits } = getModels(payload)
  for (const { model, name } of [
    ...appointmentIndexes.map((index) => ({ model: appointments, name: index.name })),
    { model: audits, name: auditIndex.name },
  ]) {
    const indexes = await getIndexes(model)
    if (indexes.some((index) => index.name === name)) {
      await model.collection.dropIndex(name)
    }
  }

  payload.logger.info({
    msg: 'Task 23 removed paid-conflict indexes; appointment and audit data were not changed.',
  })
}
