import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'
import { isDeepStrictEqual } from 'node:util'

import { defaultBookingSettings } from '@/config/booking'
import { resolveBookingSettings } from '@/lib/booking/settings'

const globalType = 'booking-settings'
const migrationMarker = '_task17BookingSettingsCreated'

export function settingsMatchDefaults(value: unknown): boolean {
  return isDeepStrictEqual(resolveBookingSettings(value), defaultBookingSettings)
}

export async function up({ payload, req, session }: MigrateUpArgs): Promise<void> {
  const existing = await payload.db.globals.findOne(
    { globalType },
    {},
    { lean: true, session },
  )
  if (existing) {
    resolveBookingSettings(existing)
    payload.logger.info({ msg: 'Task 17 booking settings already exist; migration left them unchanged.' })
    return
  }

  await payload.updateGlobal({
    slug: 'booking-settings',
    context: { disableRevalidate: true },
    data: {
      blockedIntervals: [],
      bookingWindowDays: defaultBookingSettings.bookingWindowDays,
      bufferAfterMinutes: defaultBookingSettings.bufferAfterMinutes,
      bufferBeforeMinutes: defaultBookingSettings.bufferBeforeMinutes,
      closedWeekdays: ['0', '1'],
      closures: [],
      durationMinutes: defaultBookingSettings.durationMinutes,
      holdMinutes: defaultBookingSettings.holdMinutes,
      holidays: [],
      lunchBreaks: [],
      minimumNoticeHours: defaultBookingSettings.minimumNoticeHours,
      nextDayCutoffTime: null,
      saturdayHours: defaultBookingSettings.saturdayHours,
      timezone: defaultBookingSettings.timezone,
      weekdayHours: defaultBookingSettings.weekdayHours,
    },
    overrideAccess: true,
    req,
  })

  const markerResult = await payload.db.globals.collection.updateOne(
    { globalType },
    { $set: { [migrationMarker]: true } },
    { session },
  )
  if (markerResult.matchedCount !== 1) {
    throw new Error('Task 17 migration aborted: seeded booking settings could not be marked.')
  }
  payload.logger.info({ msg: 'Task 17 booking settings seeded with the existing schedule defaults.' })
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  const existing = await payload.db.globals.findOne(
    { globalType },
    {},
    { lean: true, session },
  )
  const existingRecord = existing as unknown as Record<string, unknown> | null
  if (!existingRecord || existingRecord[migrationMarker] !== true) {
    payload.logger.info({ msg: 'Task 17 rollback left pre-existing booking settings unchanged.' })
    return
  }
  if (!settingsMatchDefaults(existingRecord)) {
    throw new Error('Task 17 rollback aborted: booking settings were edited after migration.')
  }

  await payload.db.globals.collection.deleteOne(
    { globalType, [migrationMarker]: true },
    { session },
  )
  payload.logger.info({ msg: 'Task 17 booking settings rollback removed the untouched seeded global.' })
}
