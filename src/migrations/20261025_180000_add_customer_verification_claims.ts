import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

type MongoIndex = {
  expireAfterSeconds?: number
  key?: Record<string, unknown>
  name?: string
  unique?: boolean
}

const definitions = [
  { key: { claimKey: 1 }, name: 'claimKey_1', unique: true },
  { expireAfterSeconds: 0, key: { expiresAt: 1 }, name: 'expiresAt_1' },
] as const

function getModel(payload: MigrateUpArgs['payload'] | MigrateDownArgs['payload']) {
  const model = payload.db.collections['customer-verification-claims']
  if (!model) throw new Error('[migration-gate] Customer verification claim model is required.')
  return model
}

async function getIndexes(model: ReturnType<typeof getModel>): Promise<MongoIndex[]> {
  try {
    return (await model.collection.indexes()) as MongoIndex[]
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 26) {
      return []
    }
    throw error
  }
}

function matches(index: MongoIndex, definition: (typeof definitions)[number]): boolean {
  const expected = Object.entries(definition.key)
  const actual = Object.entries(index.key ?? {})
  return actual.length === expected.length &&
    expected.every(([key, direction], position) =>
      actual[position]?.[0] === key && actual[position]?.[1] === direction) &&
    ('unique' in definition ? index.unique === true : index.unique !== true) &&
    ('expireAfterSeconds' in definition
      ? index.expireAfterSeconds === definition.expireAfterSeconds
      : index.expireAfterSeconds === undefined)
}

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const model = getModel(payload)
  for (const definition of definitions) {
    const indexes = await getIndexes(model)
    const named = indexes.find((index) => index.name === definition.name)
    if (named) {
      if (!matches(named, definition)) {
        throw new Error(`[migration-gate] ${definition.name} has an incompatible definition.`)
      }
      continue
    }
    if (indexes.some((index) => matches(index, definition))) continue
    await model.collection.createIndex(definition.key, {
      name: definition.name,
      ...('unique' in definition ? { unique: true } : {}),
      ...('expireAfterSeconds' in definition
        ? { expireAfterSeconds: definition.expireAfterSeconds }
        : {}),
    })
  }
  payload.logger.info({ msg: 'Added hashed booking email verification claims and TTL index.' })
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  const model = getModel(payload)
  if (await model.collection.countDocuments({}, { limit: 1 })) {
    throw new Error('[migration-gate] Verification claim rollback requires a reviewed data plan.')
  }
  for (const definition of [...definitions].reverse()) {
    const named = (await getIndexes(model)).find((index) => index.name === definition.name)
    if (!named) continue
    if (!matches(named, definition)) {
      throw new Error(`[migration-gate] ${definition.name} changed; manual rollback required.`)
    }
    await model.collection.dropIndex(definition.name)
  }
  payload.logger.info({ msg: 'Removed unused booking email verification indexes.' })
}
