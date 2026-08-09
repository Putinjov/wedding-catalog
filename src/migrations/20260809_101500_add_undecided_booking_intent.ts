import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

import { bookingPurposeValues } from '@/config/booking'

const legacyPurposeValues = ['buy', 'rent'] as const

function getAppointmentsModel(payload: MigrateUpArgs['payload']) {
  const appointments = payload.db.collections.appointments
  if (!appointments) {
    throw new Error('Task 18 migration aborted: appointments model is unavailable.')
  }

  return appointments
}

export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const appointments = getAppointmentsModel(payload)
  const invalidAppointments = await appointments.collection.countDocuments(
    { purpose: { $nin: [...bookingPurposeValues] } },
    { session },
  )

  if (invalidAppointments > 0) {
    throw new Error(
      `Task 18 migration aborted: ${invalidAppointments} appointment(s) have an unsupported purpose.`,
    )
  }

  payload.logger.info({
    msg: 'Task 18 verified existing appointment purposes; no records required rewriting.',
  })
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  const appointments = getAppointmentsModel(payload)
  const incompatibleAppointments = await appointments.collection.countDocuments(
    { purpose: { $nin: [...legacyPurposeValues] } },
    { session },
  )

  if (incompatibleAppointments > 0) {
    throw new Error(
      `Task 18 rollback aborted: ${incompatibleAppointments} appointment(s) cannot be represented by the previous schema.`,
    )
  }

  payload.logger.info({
    msg: 'Task 18 rollback verified that all appointments use the legacy buy/rent purposes.',
  })
}
