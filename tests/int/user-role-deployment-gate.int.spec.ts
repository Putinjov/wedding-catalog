import { describe, expect, it } from 'vitest'

import { assertPersistedUserRoles } from '@/config/migration-gate'

describe('persisted user role deployment guard', () => {
  it('allows an empty database for first-user setup', () => {
    expect(() => assertPersistedUserRoles({ totalUsers: 0, owners: 0, invalidRoles: 0 })).not.toThrow()
  })

  it('allows existing valid roles with an owner', () => {
    expect(() => assertPersistedUserRoles({ totalUsers: 3, owners: 1, invalidRoles: 0 })).not.toThrow()
  })

  it('blocks a database with users but no owner', () => {
    expect(() => assertPersistedUserRoles({ totalUsers: 2, owners: 0, invalidRoles: 0 })).toThrow(/roles require review/)
  })

  it('blocks missing or invalid roles even when an owner exists', () => {
    expect(() => assertPersistedUserRoles({ totalUsers: 3, owners: 1, invalidRoles: 1 })).toThrow(/roles require review/)
  })
})
