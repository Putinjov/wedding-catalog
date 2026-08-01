import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'
import type { ObjectId } from 'mongodb'

const legacyStatuses = [
  'available',
  'reserved',
  'rented',
  'sold',
  'cleaning',
  'repair',
  'hidden',
] as const

const saleStatuses = ['not-for-sale', 'available', 'reserved', 'sold'] as const
const rentalStatuses = [
  'not-for-rent',
  'available',
  'reserved',
  'rented',
  'cleaning',
  'repair',
] as const
const publicVisibilities = ['public', 'hidden', 'archived'] as const

const migrationMarker = '_task04LegacyAvailabilityMigrated'

type LegacyStatus = (typeof legacyStatuses)[number]
type SaleStatus = (typeof saleStatuses)[number]
type RentalStatus = (typeof rentalStatuses)[number]
type PublicVisibility = (typeof publicVisibilities)[number]

export type DressAvailability = {
  publicVisibility: PublicVisibility
  rentalStatus: RentalStatus
  saleStatus: SaleStatus
}

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

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.some((candidate) => candidate === value)
}

function readLegacyStatus(record: MigrationRecord): LegacyStatus {
  const value = record.availabilityStatus
  if (value === undefined || value === null) return 'available'
  if (isOneOf(value, legacyStatuses)) return value

  throw new Error('Task 04 migration aborted: unexpected legacy dress availability status.')
}

function readLegacyBoolean(
  record: MigrationRecord,
  field: 'availableForRent' | 'forSale' | 'isActive',
  defaultValue: boolean,
): boolean {
  const value = record[field]
  if (value === undefined || value === null) return defaultValue
  if (typeof value === 'boolean') return value

  throw new Error(`Task 04 migration aborted: unexpected legacy ${field} value.`)
}

export function mapLegacyDressAvailability(record: MigrationRecord): DressAvailability {
  const availabilityStatus = readLegacyStatus(record)
  const availableForRent = readLegacyBoolean(record, 'availableForRent', false)
  const forSale = readLegacyBoolean(record, 'forSale', true)
  const isActive = readLegacyBoolean(record, 'isActive', true)

  const publicVisibility: PublicVisibility = !isActive
    ? 'archived'
    : availabilityStatus === 'hidden'
      ? 'hidden'
      : 'public'

  const saleStatus: SaleStatus =
    availabilityStatus === 'sold'
      ? 'sold'
      : !forSale
        ? 'not-for-sale'
        : availabilityStatus === 'reserved'
          ? 'reserved'
          : 'available'

  const rentalStatus: RentalStatus =
    availabilityStatus === 'rented' ||
    availabilityStatus === 'cleaning' ||
    availabilityStatus === 'repair'
      ? availabilityStatus
      : !availableForRent
        ? 'not-for-rent'
        : availabilityStatus === 'reserved'
          ? 'reserved'
          : 'available'

  return {
    publicVisibility,
    rentalStatus,
    saleStatus,
  }
}

function readNewAvailability(record: MigrationRecord): DressAvailability | null {
  const presentFields = ['publicVisibility', 'rentalStatus', 'saleStatus'].filter((field) =>
    hasOwn(record, field),
  )
  if (presentFields.length === 0) return null

  if (
    presentFields.length !== 3 ||
    !isOneOf(record.publicVisibility, publicVisibilities) ||
    !isOneOf(record.rentalStatus, rentalStatuses) ||
    !isOneOf(record.saleStatus, saleStatuses)
  ) {
    throw new Error('Task 04 migration aborted: partial or invalid new dress availability state.')
  }

  return {
    publicVisibility: record.publicVisibility,
    rentalStatus: record.rentalStatus,
    saleStatus: record.saleStatus,
  }
}

function availabilityMatches(left: DressAvailability, right: DressAvailability): boolean {
  return (
    left.publicVisibility === right.publicVisibility &&
    left.rentalStatus === right.rentalStatus &&
    left.saleStatus === right.saleStatus
  )
}

function asRecord(value: unknown, context: string): MigrationRecord {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as MigrationRecord
  }

  throw new Error(`Task 04 migration aborted: invalid ${context} record.`)
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
      throw new Error('Task 04 migration aborted: dress record is missing its database ID.')
    }

    return {
      id: record._id as ObjectId,
      model,
      target: versioned ? asRecord(record.version, 'dress version') : record,
      versioned,
    }
  })
}

function prepareUp(targets: MigrationTarget[]): Array<MigrationTarget & DressAvailability> {
  return targets.flatMap((target) => {
    const current = readNewAvailability(target.target)
    const migrated = target.target[migrationMarker] === true

    if (migrated) {
      if (!current) {
        throw new Error('Task 04 migration aborted: migration marker has no new availability state.')
      }
      return []
    }

    if (current) {
      throw new Error(
        'Task 04 migration aborted: new availability fields exist without a legacy migration marker.',
      )
    }

    return [{ ...target, ...mapLegacyDressAvailability(target.target) }]
  })
}

function prepareDown(targets: MigrationTarget[]): MigrationTarget[] {
  return targets.map((target) => {
    if (target.target[migrationMarker] !== true) {
      throw new Error(
        'Task 04 rollback aborted: a dress or version was created after migration and has no legacy snapshot.',
      )
    }

    const current = readNewAvailability(target.target)
    const originalMapping = mapLegacyDressAvailability(target.target)
    if (!current || !availabilityMatches(current, originalMapping)) {
      throw new Error(
        'Task 04 rollback aborted: availability changed after migration and cannot be collapsed safely.',
      )
    }

    return target
  })
}

async function applyUp(
  targets: Array<MigrationTarget & DressAvailability>,
  session: MigrateUpArgs['session'],
): Promise<void> {
  for (const target of targets) {
    const prefix = target.versioned ? 'version.' : ''
    // Use the underlying collection so the rollback marker is retained even though it is
    // intentionally not part of the public Payload schema.
    await target.model.collection.updateOne(
      { _id: target.id },
      {
        $set: {
          [`${prefix}${migrationMarker}`]: true,
          [`${prefix}publicVisibility`]: target.publicVisibility,
          [`${prefix}rentalStatus`]: target.rentalStatus,
          [`${prefix}saleStatus`]: target.saleStatus,
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
          [`${prefix}publicVisibility`]: 1,
          [`${prefix}rentalStatus`]: 1,
          [`${prefix}saleStatus`]: 1,
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
    throw new Error('Task 04 migration aborted: dress or dress version model is unavailable.')
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
    msg: `Task 04 availability migration updated ${updates.length} dress records and versions.`,
  })
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  const targets = await getAllTargets({ payload, session })
  const rollbacks = prepareDown(targets)

  await applyDown(rollbacks, session)
  payload.logger.info({
    msg: `Task 04 availability rollback restored ${rollbacks.length} dress records and versions.`,
  })
}
