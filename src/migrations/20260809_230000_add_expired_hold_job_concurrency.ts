import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

const concurrencyIndexName = 'concurrencyKey_1'

type JobIndex = {
  key?: Record<string, unknown>
  name?: string
}

function getJobsModel(payload: MigrateUpArgs['payload'] | MigrateDownArgs['payload']) {
  const jobs = payload.db.collections['payload-jobs']
  if (!jobs) {
    throw new Error('Task 22 migration aborted: payload-jobs model is unavailable.')
  }
  return jobs
}

function isNamespaceNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 26
  )
}

async function getJobIndexes(
  jobs: ReturnType<typeof getJobsModel>,
): Promise<JobIndex[]> {
  try {
    return (await jobs.collection.indexes()) as JobIndex[]
  } catch (error) {
    if (isNamespaceNotFound(error)) return []
    throw error
  }
}

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const jobs = getJobsModel(payload)
  const indexes = await getJobIndexes(jobs)
  const existing = indexes.find((index) => index.name === concurrencyIndexName)

  if (existing) {
    if (existing.key?.concurrencyKey !== 1) {
      throw new Error(
        'Task 22 migration aborted: concurrencyKey_1 exists with an incompatible definition.',
      )
    }
  } else {
    await jobs.collection.createIndex(
      { concurrencyKey: 1 },
      { name: concurrencyIndexName },
    )
  }

  payload.logger.info({
    msg: 'Task 22 verified the Payload job concurrency index for expired-hold cleanup.',
  })
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  const jobs = getJobsModel(payload)
  const indexes = await getJobIndexes(jobs)
  if (indexes.some((index) => index.name === concurrencyIndexName)) {
    await jobs.collection.dropIndex(concurrencyIndexName)
  }

  payload.logger.info({
    msg: 'Task 22 removed the Payload job concurrency index; appointment data was not changed.',
  })
}
