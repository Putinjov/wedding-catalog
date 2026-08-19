import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

import { verifiedBookingVisitDetails } from '@/config/booking'

const globalType = 'booking-settings'
const addressMarker = '_task25SeededVisitAddress'
const mapUrlMarker = '_task25SeededVisitMapUrl'

type BookingSettingsRecord = {
  [addressMarker]?: boolean
  [mapUrlMarker]?: boolean
  visitDetails?: unknown
}

type VisitDetailsRecord = {
  address?: null | string
  mapUrl?: null | string
  [key: string]: unknown
}

function populated(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function readVisitDetails(value: unknown): VisitDetailsRecord | null {
  if (value == null) return null
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as VisitDetailsRecord
  }

  throw new Error(
    '[migration-gate] Task 25 aborted: booking visit details have an unexpected data shape.',
  )
}

function safeErrorName(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  return /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(name) ? name : 'UnknownError'
}

export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const existing = (await payload.db.globals.findOne(
    { globalType },
    {},
    { lean: true, session },
  )) as BookingSettingsRecord | null

  if (!existing) {
    throw new Error(
      '[migration-gate] Task 25 aborted: booking settings must exist before visit details are seeded.',
    )
  }

  const visitDetails = readVisitDetails(existing.visitDetails)
  const currentAddress = visitDetails?.address
  const currentMapUrl = visitDetails?.mapUrl
  if (populated(currentAddress) && currentAddress !== verifiedBookingVisitDetails.address) {
    throw new Error(
      '[migration-gate] Task 25 aborted: the existing fitting address requires manual review.',
    )
  }
  if (populated(currentMapUrl) && currentMapUrl !== verifiedBookingVisitDetails.mapUrl) {
    throw new Error(
      '[migration-gate] Task 25 aborted: the existing fitting map URL requires manual review.',
    )
  }

  const shouldSeedAddress = !populated(currentAddress)
  const shouldSeedMapUrl = !populated(currentMapUrl)
  const set: Record<string, unknown> = {}

  if (visitDetails === null) {
    set.visitDetails = {
      address: verifiedBookingVisitDetails.address,
      mapUrl: verifiedBookingVisitDetails.mapUrl,
    }
    set[addressMarker] = true
    set[mapUrlMarker] = true
  } else {
    if (shouldSeedAddress) {
      set['visitDetails.address'] = verifiedBookingVisitDetails.address
      set[addressMarker] = true
    }
    if (shouldSeedMapUrl) {
      set['visitDetails.mapUrl'] = verifiedBookingVisitDetails.mapUrl
      set[mapUrlMarker] = true
    }
  }

  if (Object.keys(set).length === 0) {
    payload.logger.info({
      msg: 'Task 25 verified booking visit address already exists; migration left it unchanged.',
    })
    return
  }

  let result: { matchedCount: number }
  try {
    result = await payload.db.globals.collection.updateOne(
      { globalType },
      { $set: set },
      { session },
    )
  } catch (error: unknown) {
    throw new Error(
      `[migration-gate] Task 25 database update failed (${safeErrorName(error)}); no visit details were recorded.`,
    )
  }
  if (result.matchedCount !== 1) {
    throw new Error('[migration-gate] Task 25 aborted: booking visit details were not updated.')
  }

  payload.logger.info({ msg: 'Task 25 seeded the verified booking visit address and map link.' })
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  const existing = (await payload.db.globals.findOne(
    { globalType },
    {},
    { lean: true, session },
  )) as BookingSettingsRecord | null
  if (!existing) return

  const unset: Record<string, ''> = {}
  const hasMigrationMarker =
    existing[addressMarker] === true || existing[mapUrlMarker] === true
  const visitDetails = hasMigrationMarker ? readVisitDetails(existing.visitDetails) : null
  if (existing[addressMarker] === true) {
    if (visitDetails?.address !== verifiedBookingVisitDetails.address) {
      throw new Error(
        '[migration-gate] Task 25 rollback aborted: the fitting address was edited after migration.',
      )
    }
    unset['visitDetails.address'] = ''
    unset[addressMarker] = ''
  }
  if (existing[mapUrlMarker] === true) {
    if (visitDetails?.mapUrl !== verifiedBookingVisitDetails.mapUrl) {
      throw new Error(
        '[migration-gate] Task 25 rollback aborted: the fitting map URL was edited after migration.',
      )
    }
    unset['visitDetails.mapUrl'] = ''
    unset[mapUrlMarker] = ''
  }

  if (Object.keys(unset).length === 0) return
  try {
    await payload.db.globals.collection.updateOne(
      { globalType },
      { $unset: unset },
      { session },
    )
  } catch (error: unknown) {
    throw new Error(
      `[migration-gate] Task 25 rollback database update failed (${safeErrorName(error)}).`,
    )
  }
  payload.logger.info({
    msg: 'Task 25 rollback removed only unchanged visit details seeded by the migration.',
  })
}
