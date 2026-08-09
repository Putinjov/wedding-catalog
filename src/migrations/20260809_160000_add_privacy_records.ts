import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

const privacyFields = [
  'privacyPolicyVersion',
  'privacyNoticeProvidedAt',
  'privacyNoticeMethod',
  'privacyNoticeTextHash',
  'privacyAcknowledgedAt',
  'privacyAcknowledgementTextHash',
  'privacyAcknowledgementSource',
  'marketingConsentStatus',
  'marketingConsentAt',
  'marketingConsentTextHash',
  'marketingConsentChannel',
  'marketingConsentCaptureMethod',
] as const

function getAppointmentsModel(payload: MigrateUpArgs['payload']) {
  const appointments = payload.db.collections.appointments
  if (!appointments) {
    throw new Error('Task 20 migration aborted: appointments model is unavailable.')
  }
  return appointments
}

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  getAppointmentsModel(payload)
  payload.logger.info({
    msg: 'Task 20 added nullable privacy evidence fields; historical appointments were not backfilled.',
  })
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  const appointments = getAppointmentsModel(payload)
  const privacyRecordCount = await appointments.collection.countDocuments(
    {
      $or: privacyFields.map((field) => ({ [field]: { $exists: true } })),
    },
    { session },
  )

  if (privacyRecordCount > 0) {
    throw new Error(
      `Task 20 rollback aborted: ${privacyRecordCount} appointment(s) contain privacy evidence that must not be silently discarded.`,
    )
  }

  payload.logger.info({
    msg: 'Task 20 rollback verified that no appointment privacy evidence would be lost.',
  })
}
