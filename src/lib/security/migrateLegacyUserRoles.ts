import type { Payload } from 'payload'

export async function migrateLegacyUserRoles(payload: Payload): Promise<void> {
  const owners = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { role: { equals: 'owner' } },
  })

  if (owners.totalDocs === 0) {
    const oldestUser = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      sort: 'createdAt',
    })
    const user = oldestUser.docs[0]
    if (user) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { role: 'owner' },
        overrideAccess: true,
      })
      payload.logger.info('Assigned the owner role to the oldest legacy user account.')
    }
  }

  const legacyUsers = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    where: { role: { exists: false } },
  })

  for (const user of legacyUsers.docs) {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { role: 'staff' },
      overrideAccess: true,
    })
  }

  if (legacyUsers.docs.length > 0) {
    payload.logger.info(`Assigned staff roles to ${legacyUsers.docs.length} legacy user account(s).`)
  }
}
