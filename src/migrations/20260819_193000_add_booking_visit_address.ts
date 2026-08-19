import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

import { verifiedBookingVisitDetails } from '@/config/booking'

const globalType = 'booking-settings'
const addressMarker = '_task25SeededVisitAddress'
const mapUrlMarker = '_task25SeededVisitMapUrl'

type BookingSettingsRecord = {
  [addressMarker]?: boolean
  [mapUrlMarker]?: boolean
  visitDetails?: {
    address?: null | string
    mapUrl?: null | string
  }
}

function populated(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
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

  const currentAddress = existing.visitDetails?.address
  const currentMapUrl = existing.visitDetails?.mapUrl
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

  const set: Record<string, unknown> = {}
  if (!populated(currentAddress)) {
    set['visitDetails.address'] = verifiedBookingVisitDetails.address
    set[addressMarker] = true
  }
  if (!populated(currentMapUrl)) {
    set['visitDetails.mapUrl'] = verifiedBookingVisitDetails.mapUrl
    set[mapUrlMarker] = true
  }

  if (Object.keys(set).length === 0) {
    payload.logger.info({
      msg: 'Task 25 verified booking visit address already exists; migration left it unchanged.',
    })
    return
  }

  const result = await payload.db.globals.collection.updateOne(
    { globalType },
    { $set: set },
    { session },
  )
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
  if (existing[addressMarker] === true) {
    if (existing.visitDetails?.address !== verifiedBookingVisitDetails.address) {
      throw new Error(
        '[migration-gate] Task 25 rollback aborted: the fitting address was edited after migration.',
      )
    }
    unset['visitDetails.address'] = ''
    unset[addressMarker] = ''
  }
  if (existing[mapUrlMarker] === true) {
    if (existing.visitDetails?.mapUrl !== verifiedBookingVisitDetails.mapUrl) {
      throw new Error(
        '[migration-gate] Task 25 rollback aborted: the fitting map URL was edited after migration.',
      )
    }
    unset['visitDetails.mapUrl'] = ''
    unset[mapUrlMarker] = ''
  }

  if (Object.keys(unset).length === 0) return
  await payload.db.globals.collection.updateOne(
    { globalType },
    { $unset: unset },
    { session },
  )
  payload.logger.info({
    msg: 'Task 25 rollback removed only unchanged visit details seeded by the migration.',
  })
}
