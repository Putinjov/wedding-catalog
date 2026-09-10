import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

import type { BookingSetting } from '@/payload-types'
import { resolveBookingSettings } from '@/lib/booking/settings'

// Keep this snapshot independent of defaults used by earlier migrations.
export const updatedFittingSchedule = {
  closedWeekdays: ['2', '4'],
  durationMinutes: 90,
  weekdayHours: { end: '17:00', start: '10:00' },
} satisfies Partial<BookingSetting>

export function classifyFittingSchedule(value: unknown): 'original' | 'updated' {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !('durationMinutes' in value) ||
    value.durationMinutes == null ||
    !('closedWeekdays' in value) ||
    !Array.isArray(value.closedWeekdays) ||
    !('weekdayHours' in value) ||
    typeof value.weekdayHours !== 'object' ||
    value.weekdayHours === null ||
    !('start' in value.weekdayHours) ||
    typeof value.weekdayHours.start !== 'string' ||
    !('end' in value.weekdayHours) ||
    typeof value.weekdayHours.end !== 'string'
  ) {
    throw new Error('Schedule migration aborted: incomplete settings; manual review required.')
  }
  const settings = resolveBookingSettings(value)
  const closedDays = [...settings.closedWeekdays].sort().join(',')
  if (settings.weekdayHours.start !== '10:00' || settings.weekdayHours.end !== '17:00') {
    throw new Error(
      'Schedule migration aborted: opening hours changed; review the schedule manually.',
    )
  }
  if (closedDays === '2,4' && settings.durationMinutes === 90) return 'updated'
  if (closedDays === '0,1' && settings.durationMinutes === 60) return 'original'
  throw new Error(
    'Schedule migration aborted: unexpected existing schedule; manual review required.',
  )
}

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const current = await payload.findGlobal({
    slug: 'booking-settings',
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (!current?.id) {
    throw new Error('Schedule migration aborted: persisted booking settings are missing.')
  }
  if (classifyFittingSchedule(current) === 'updated') {
    payload.logger.info('Fitting schedule already updated; no changes made.')
    return
  }

  // Validate existing breaks and exceptions with the new schedule before writing.
  resolveBookingSettings({ ...current, ...updatedFittingSchedule })
  await payload.updateGlobal({
    slug: 'booking-settings',
    data: updatedFittingSchedule,
    context: { disableRevalidate: true },
    overrideAccess: true,
    req,
  })
  payload.logger.info(
    'Fitting schedule updated. Existing appointments were left unchanged. Deploy the versioned booking settings cache before smoke checks.',
  )
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error(
    'Automatic schedule rollback is disabled: Sunday/Monday appointments and 90-minute bookings may now exist. Agree a replacement schedule and preserve existing appointments before reverting.',
  )
}
