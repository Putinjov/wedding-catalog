import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

const supportedPurposes = ['buy', 'rent', 'undecided', 'follow_up']

export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const appointments = payload.db.collections.appointments
  if (!appointments) throw new Error('Follow-up migration: appointments model unavailable.')
  const unsupported = await appointments.collection.countDocuments(
    { purpose: { $nin: supportedPurposes } }, { session },
  )
  if (unsupported > 0) throw new Error('Follow-up migration: unsupported appointment purposes require review.')
  payload.logger.info({ msg: 'Follow-up purpose enabled; no historical records rewritten.' })
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  const appointments = payload.db.collections.appointments
  if (!appointments) throw new Error('Follow-up rollback: appointments model unavailable.')
  const incompatible = await appointments.collection.countDocuments(
    { purpose: { $nin: ['buy', 'rent', 'undecided'] } }, { session },
  )
  if (incompatible > 0) {
    throw new Error('Follow-up rollback requires a reviewed data plan; appointments were not modified.')
  }
  payload.logger.info({ msg: 'Follow-up rollback verified; no records modified.' })
}
