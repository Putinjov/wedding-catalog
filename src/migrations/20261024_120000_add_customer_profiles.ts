import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

type MongoIndex = {
  key?: Record<string, unknown>
  name?: string
  unique?: boolean
}

type Model = NonNullable<MigrateUpArgs['payload']['db']['collections'][string]>

const profileEmailIndex = { key: { email: 1 }, name: 'email_1', unique: true } as const
const appointmentCustomerIndex = { key: { customer: 1 }, name: 'customer_1' } as const

function getModels(payload: MigrateUpArgs['payload'] | MigrateDownArgs['payload']) {
  const customers = payload.db.collections.customers
  const appointments = payload.db.collections.appointments
  if (!customers || !appointments) {
    throw new Error('[migration-gate] Customer profile and appointment models are required.')
  }
  return { appointments, customers }
}

function isNamespaceNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 26
}

async function getIndexes(model: Model): Promise<MongoIndex[]> {
  try {
    return (await model.collection.indexes()) as MongoIndex[]
  } catch (error) {
    if (isNamespaceNotFound(error)) return []
    throw error
  }
}

function matches(
  index: MongoIndex,
  expected: typeof profileEmailIndex | typeof appointmentCustomerIndex,
): boolean {
  const actualKeys = Object.entries(index.key ?? {})
  const expectedKeys = Object.entries(expected.key)
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every(
      ([field, direction], position) =>
        actualKeys[position]?.[0] === field && actualKeys[position]?.[1] === direction,
    ) &&
    ('unique' in expected ? index.unique === true : index.unique !== true)
  )
}

async function ensureIndex(
  model: Model,
  definition: typeof profileEmailIndex | typeof appointmentCustomerIndex,
): Promise<void> {
  const indexes = await getIndexes(model)
  const named = indexes.find((index) => index.name === definition.name)
  if (named) {
    if (!matches(named, definition)) {
      throw new Error(`[migration-gate] ${definition.name} has an incompatible definition.`)
    }
    return
  }
  if (indexes.some((index) => matches(index, definition))) return
  await model.collection.createIndex(definition.key, {
    name: definition.name,
    ...('unique' in definition ? { unique: true } : {}),
  })
}

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const { appointments, customers } = getModels(payload)
  await ensureIndex(customers, profileEmailIndex)
  await ensureIndex(appointments, appointmentCustomerIndex)
  payload.logger.info({
    msg: 'Added customer profile identity and appointment relationship indexes; no records were linked.',
  })
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  const { appointments, customers } = getModels(payload)
  const profileCount = await customers.collection.countDocuments({}, { limit: 1 })
  const linkedCount = await appointments.collection.countDocuments(
    { customer: { $exists: true, $ne: null } },
    { limit: 1 },
  )
  if (profileCount > 0 || linkedCount > 0) {
    throw new Error(
      '[migration-gate] Customer profile rollback requires a reviewed data plan; records were preserved.',
    )
  }

  for (const [model, definition] of [
    [appointments, appointmentCustomerIndex],
    [customers, profileEmailIndex],
  ] as const) {
    const named = (await getIndexes(model)).find((index) => index.name === definition.name)
    if (!named) continue
    if (!matches(named, definition)) {
      throw new Error(`[migration-gate] ${definition.name} changed; manual rollback required.`)
    }
    await model.collection.dropIndex(definition.name)
  }
  payload.logger.info({
    msg: 'Removed unused customer profile indexes; no customer records were deleted.',
  })
}
