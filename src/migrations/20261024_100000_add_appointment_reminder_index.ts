import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

type MongoIndex = {
  key?: Record<string, unknown>
  name?: string
}

const indexName = 'appointment_reminders_status_startAt'
const indexKey = { status: 1, startAt: 1 } as const

function getAppointmentsModel(payload: MigrateUpArgs['payload'] | MigrateDownArgs['payload']) {
  const appointments = payload.db.collections.appointments
  if (!appointments) {
    throw new Error('[migration-gate] Appointment reminder index requires appointments.')
  }
  return appointments
}

function isNamespaceNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 26
}

async function getIndexes(model: ReturnType<typeof getAppointmentsModel>): Promise<MongoIndex[]> {
  try {
    return (await model.collection.indexes()) as MongoIndex[]
  } catch (error) {
    if (isNamespaceNotFound(error)) return []
    throw error
  }
}

function matchesReminderKey(index: MongoIndex): boolean {
  const entries = Object.entries(index.key ?? {})
  return (
    entries.length === 2 &&
    entries[0]?.[0] === 'status' &&
    entries[0]?.[1] === 1 &&
    entries[1]?.[0] === 'startAt' &&
    entries[1]?.[1] === 1
  )
}

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const appointments = getAppointmentsModel(payload)
  const indexes = await getIndexes(appointments)
  const named = indexes.find((index) => index.name === indexName)
  if (named && !matchesReminderKey(named)) {
    throw new Error('[migration-gate] Appointment reminder index name is incompatible.')
  }
  if (named || indexes.some(matchesReminderKey)) return

  await appointments.collection.createIndex(indexKey, { name: indexName })
  payload.logger.info({ msg: 'Added appointment reminder status and start-time lookup index.' })
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  const appointments = getAppointmentsModel(payload)
  const named = (await getIndexes(appointments)).find((index) => index.name === indexName)
  if (!named) return
  if (!matchesReminderKey(named)) {
    throw new Error('[migration-gate] Appointment reminder index changed; manual rollback required.')
  }

  await appointments.collection.dropIndex(indexName)
  payload.logger.info({ msg: 'Removed appointment reminder lookup index; records were preserved.' })
}
