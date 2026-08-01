import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'
import type { ObjectId } from 'mongodb'

const migrationMarker = '_task10DisplayOrderMigrated'

type MigrationRecord = Record<string, unknown>
type MigrationModel = MigrateUpArgs['payload']['db']['collections'][string]

type MigrationTarget = {
  id: ObjectId
  model: MigrationModel
  target: MigrationRecord
  versioned: boolean
}

function hasOwn(record: MigrationRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function asRecord(value: unknown, context: string): MigrationRecord {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as MigrationRecord
  }

  throw new Error(`Task 10 migration aborted: invalid ${context} record.`)
}

function isValidDisplayOrder(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

async function loadTargets({
  model,
  session,
  versioned,
}: {
  model: MigrationModel
  session: MigrateUpArgs['session']
  versioned: boolean
}): Promise<MigrationTarget[]> {
  const documents: unknown[] = await model.find({}, {}, { lean: true, session })

  return documents.map((document) => {
    const record = asRecord(document, versioned ? 'dress version wrapper' : 'dress')
    if (!hasOwn(record, '_id')) {
      throw new Error('Task 10 migration aborted: dress record is missing its database ID.')
    }

    return {
      id: record._id as ObjectId,
      model,
      target: versioned ? asRecord(record.version, 'dress version') : record,
      versioned,
    }
  })
}

function prepareUp(targets: MigrationTarget[]): MigrationTarget[] {
  return targets.flatMap((target) => {
    const migrated = target.target[migrationMarker] === true
    const hasDisplayOrder = hasOwn(target.target, 'displayOrder')

    if (migrated) {
      if (!isValidDisplayOrder(target.target.displayOrder)) {
        throw new Error(
          'Task 10 migration aborted: migration marker has no valid display order.',
        )
      }
      return []
    }

    if (hasDisplayOrder) {
      throw new Error(
        'Task 10 migration aborted: display order exists without a migration marker.',
      )
    }

    return [target]
  })
}

function prepareDown(targets: MigrationTarget[]): MigrationTarget[] {
  return targets.map((target) => {
    if (target.target[migrationMarker] !== true) {
      throw new Error(
        'Task 10 rollback aborted: a dress or version was created after migration and has no rollback marker.',
      )
    }

    if (target.target.displayOrder !== 0) {
      throw new Error(
        'Task 10 rollback aborted: edited display order cannot be represented safely by the previous schema.',
      )
    }

    return target
  })
}

async function applyUp(
  targets: MigrationTarget[],
  session: MigrateUpArgs['session'],
): Promise<void> {
  for (const target of targets) {
    const prefix = target.versioned ? 'version.' : ''
    await target.model.collection.updateOne(
      { _id: target.id },
      {
        $set: {
          [`${prefix}${migrationMarker}`]: true,
          [`${prefix}displayOrder`]: 0,
        },
      },
      { session },
    )
  }
}

async function applyDown(
  targets: MigrationTarget[],
  session: MigrateDownArgs['session'],
): Promise<void> {
  for (const target of targets) {
    const prefix = target.versioned ? 'version.' : ''
    await target.model.collection.updateOne(
      { _id: target.id },
      {
        $unset: {
          [`${prefix}${migrationMarker}`]: 1,
          [`${prefix}displayOrder`]: 1,
        },
      },
      { session },
    )
  }
}

async function getAllTargets({
  payload,
  session,
}: Pick<MigrateUpArgs, 'payload' | 'session'>): Promise<MigrationTarget[]> {
  const dresses = payload.db.collections.dresses
  const dressVersions = payload.db.versions.dresses
  if (!dresses || !dressVersions) {
    throw new Error('Task 10 migration aborted: dress or dress version model is unavailable.')
  }

  // MongoDB does not support parallel operations on the same transaction session.
  const documents = await loadTargets({ model: dresses, session, versioned: false })
  const versions = await loadTargets({ model: dressVersions, session, versioned: true })

  return [...documents, ...versions]
}

export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const targets = await getAllTargets({ payload, session })
  const updates = prepareUp(targets)

  await applyUp(updates, session)
  payload.logger.info({
    msg: `Task 10 display-order migration updated ${updates.length} dress records and versions.`,
  })
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  const targets = await getAllTargets({ payload, session })
  const rollbacks = prepareDown(targets)

  await applyDown(rollbacks, session)
  payload.logger.info({
    msg: `Task 10 display-order rollback restored ${rollbacks.length} dress records and versions.`,
  })
}
