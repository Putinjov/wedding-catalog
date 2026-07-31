import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'
import type { ObjectId } from 'mongodb'

const saleStatuses = ['not-for-sale', 'available', 'reserved', 'sold'] as const
const migrationMarker = '_task06SalePriceOnRequestMigrated'

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

function isSaleStatus(value: unknown): value is (typeof saleStatuses)[number] {
  return typeof value === 'string' && saleStatuses.some((status) => status === value)
}

function asRecord(value: unknown, context: string): MigrationRecord {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as MigrationRecord
  }

  throw new Error(`Task 06 migration aborted: invalid ${context} record.`)
}

export function deriveSalePriceOnRequest(record: MigrationRecord): boolean {
  if (!isSaleStatus(record.saleStatus)) {
    throw new Error('Task 06 migration aborted: missing or invalid sale status.')
  }

  const salePrice = record.salePrice
  if (
    salePrice !== undefined &&
    salePrice !== null &&
    (typeof salePrice !== 'number' || !Number.isFinite(salePrice))
  ) {
    throw new Error('Task 06 migration aborted: invalid sale price.')
  }

  return record.saleStatus !== 'not-for-sale' && salePrice == null
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
      throw new Error('Task 06 migration aborted: dress record is missing its database ID.')
    }

    return {
      id: record._id as ObjectId,
      model,
      target: versioned ? asRecord(record.version, 'dress version') : record,
      versioned,
    }
  })
}

function prepareUp(
  targets: MigrationTarget[],
): Array<MigrationTarget & { salePriceOnRequest: boolean }> {
  return targets.flatMap((target) => {
    const migrated = target.target[migrationMarker] === true
    const hasNewField = hasOwn(target.target, 'salePriceOnRequest')

    if (migrated) {
      if (typeof target.target.salePriceOnRequest !== 'boolean') {
        throw new Error(
          'Task 06 migration aborted: migration marker has no valid price-on-request state.',
        )
      }
      return []
    }

    if (hasNewField) {
      throw new Error(
        'Task 06 migration aborted: price-on-request state exists without a migration marker.',
      )
    }

    return [
      {
        ...target,
        salePriceOnRequest: deriveSalePriceOnRequest(target.target),
      },
    ]
  })
}

function prepareDown(targets: MigrationTarget[]): MigrationTarget[] {
  return targets.map((target) => {
    if (target.target[migrationMarker] !== true) {
      throw new Error(
        'Task 06 rollback aborted: a dress or version was created after migration and has no rollback marker.',
      )
    }

    if (
      typeof target.target.salePriceOnRequest !== 'boolean' ||
      target.target.salePriceOnRequest !== deriveSalePriceOnRequest(target.target)
    ) {
      throw new Error(
        'Task 06 rollback aborted: price-on-request state cannot be represented safely by the previous schema.',
      )
    }

    return target
  })
}

async function applyUp(
  targets: Array<MigrationTarget & { salePriceOnRequest: boolean }>,
  session: MigrateUpArgs['session'],
): Promise<void> {
  for (const target of targets) {
    const prefix = target.versioned ? 'version.' : ''
    await target.model.collection.updateOne(
      { _id: target.id },
      {
        $set: {
          [`${prefix}${migrationMarker}`]: true,
          [`${prefix}salePriceOnRequest`]: target.salePriceOnRequest,
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
          [`${prefix}salePriceOnRequest`]: 1,
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
    throw new Error('Task 06 migration aborted: dress or dress version model is unavailable.')
  }

  const [documents, versions] = await Promise.all([
    loadTargets({ model: dresses, session, versioned: false }),
    loadTargets({ model: dressVersions, session, versioned: true }),
  ])

  return [...documents, ...versions]
}

export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const targets = await getAllTargets({ payload, session })
  const updates = prepareUp(targets)

  await applyUp(updates, session)
  payload.logger.info({
    msg: `Task 06 price-on-request migration updated ${updates.length} dress records and versions.`,
  })
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  const targets = await getAllTargets({ payload, session })
  const rollbacks = prepareDown(targets)

  await applyDown(rollbacks, session)
  payload.logger.info({
    msg: `Task 06 price-on-request rollback restored ${rollbacks.length} dress records and versions.`,
  })
}
