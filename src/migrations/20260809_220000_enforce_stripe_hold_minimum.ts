import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

import { STRIPE_CHECKOUT_MINIMUM_HOLD_MINUTES } from '@/config/booking'
import { resolveBookingSettings } from '@/lib/booking/settings'

const globalType = 'booking-settings'

export function assertStripeCompatibleBookingHold(value: unknown): void {
  try {
    resolveBookingSettings(value)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Booking settings are invalid.'
    throw new Error(
      `[migration-gate] Task 21 migration aborted: ${reason} Stripe Checkout requires holdMinutes to be at least ${STRIPE_CHECKOUT_MINIMUM_HOLD_MINUTES}.`,
    )
  }
}

export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const existing = await payload.db.globals.findOne(
    { globalType },
    {},
    { lean: true, session },
  )

  assertStripeCompatibleBookingHold(existing)
  payload.logger.info({
    msg: 'Task 21 verified that the shared booking hold is compatible with Stripe Checkout.',
  })
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info({
    msg: 'Task 21 rollback requires no data changes because the migration only validated settings.',
  })
}
