import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

const legacyCombinations = [
  { status: 'pending', paymentStatus: { $in: ['unpaid', 'pending', 'paid', 'failed', 'refunded'] } },
  { status: 'confirmed', paymentStatus: { $in: ['unpaid', 'paid', 'refunded'] } },
  { status: 'cancelled', paymentStatus: { $in: ['unpaid', 'pending', 'paid', 'failed', 'refunded'] } },
  { status: { $in: ['completed', 'no-show'] }, paymentStatus: { $in: ['unpaid', 'paid', 'refunded'] } },
] as const

const rollbackCompatibleCombinations = [
  { status: 'pending_payment', paymentStatus: 'unpaid' },
  { status: 'payment_processing', paymentStatus: 'processing' },
  { status: 'confirmed', paymentStatus: { $in: ['unpaid', 'paid'] } },
  { status: 'cancelled', paymentStatus: { $in: ['unpaid', 'processing', 'paid', 'failed'] } },
  { status: { $in: ['completed', 'no_show'] }, paymentStatus: { $in: ['unpaid', 'paid', 'refunded'] } },
  { status: 'payment_failed', paymentStatus: 'failed' },
  { status: 'refunded', paymentStatus: 'refunded' },
] as const

function getAppointmentsModel(payload: MigrateUpArgs['payload']) {
  const appointments = payload.db.collections.appointments
  if (!appointments) {
    throw new Error('Task 27 migration aborted: appointments model is unavailable.')
  }
  return appointments
}

export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const appointments = getAppointmentsModel(payload)
  const incompatibleCount = await appointments.collection.countDocuments(
    { $nor: [...legacyCombinations] },
    { session },
  )
  if (incompatibleCount > 0) {
    throw new Error(
      `Task 27 migration aborted: ${incompatibleCount} appointment(s) have an ambiguous legacy lifecycle.`,
    )
  }

  await appointments.collection.updateMany(
    { status: 'pending', paymentStatus: 'unpaid' },
    { $set: { status: 'pending_payment' } },
    { session },
  )
  await appointments.collection.updateMany(
    { status: 'pending', paymentStatus: 'pending' },
    { $set: { paymentStatus: 'processing', status: 'payment_processing' } },
    { session },
  )
  await appointments.collection.updateMany(
    { status: 'pending', paymentStatus: 'failed' },
    { $set: { status: 'payment_failed' } },
    { session },
  )
  await appointments.collection.updateMany(
    { status: 'pending', paymentStatus: 'paid', needsAdminReview: true },
    { $set: { status: 'payment_received_conflict' } },
    { session },
  )
  await appointments.collection.updateMany(
    { status: 'pending', paymentStatus: 'paid', needsAdminReview: { $ne: true } },
    { $set: { status: 'confirmed' } },
    { session },
  )
  await appointments.collection.updateMany(
    { status: { $in: ['pending', 'confirmed', 'cancelled'] }, paymentStatus: 'refunded' },
    { $set: { status: 'refunded' } },
    { session },
  )
  await appointments.collection.updateMany(
    { status: 'no-show' },
    { $set: { status: 'no_show' } },
    { session },
  )
  await appointments.collection.updateMany(
    { paymentStatus: 'pending' },
    { $set: { paymentStatus: 'processing' } },
    { session },
  )

  payload.logger.info({
    msg: 'Task 27 migrated legacy appointment and payment lifecycle values.',
  })
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  const appointments = getAppointmentsModel(payload)
  const incompatibleCount = await appointments.collection.countDocuments(
    { $nor: [...rollbackCompatibleCombinations] },
    { session },
  )
  if (incompatibleCount > 0) {
    throw new Error(
      `Task 27 rollback aborted: ${incompatibleCount} appointment(s) cannot be represented safely by the legacy lifecycle.`,
    )
  }

  await appointments.collection.updateMany(
    { status: { $in: ['pending_payment', 'payment_processing', 'payment_failed'] } },
    { $set: { status: 'pending' } },
    { session },
  )
  await appointments.collection.updateMany(
    { status: 'no_show' },
    { $set: { status: 'no-show' } },
    { session },
  )
  await appointments.collection.updateMany(
    { status: 'refunded' },
    { $set: { status: 'cancelled' } },
    { session },
  )
  await appointments.collection.updateMany(
    { paymentStatus: 'processing' },
    { $set: { paymentStatus: 'pending' } },
    { session },
  )

  payload.logger.info({
    msg: 'Task 27 restored legacy appointment and payment lifecycle values.',
  })
}
