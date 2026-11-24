import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const model = payload.db.collections['payload-kv']
  if (!model) throw new Error('[migration-gate] Payload key-value model is unavailable.')
  const indexes = await model.collection.indexes().catch((error: unknown) => {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 26) return []
    throw error
  })
  const existing = indexes.find((index) => index.name === 'key_1')
  if (existing) {
    if (existing.unique !== true || existing.key?.key !== 1 || Object.keys(existing.key).length !== 1) {
      throw new Error('[migration-gate] Payload key-value index has an incompatible definition.')
    }
    return
  }
  await model.collection.createIndex({ key: 1 }, { name: 'key_1', unique: true })
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // The index also protects other Payload key-value entries.
}
