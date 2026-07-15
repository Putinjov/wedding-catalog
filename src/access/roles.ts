import type { FieldAccess, PayloadRequest } from 'payload'

export const userRoles = ['owner', 'manager', 'staff'] as const
export type UserRole = (typeof userRoles)[number]

type UserWithRole = {
  id?: number | string
  role?: UserRole | null
}

function isUserWithRole(user: unknown): user is UserWithRole {
  return Boolean(user && typeof user === 'object')
}

export function getUserRole(user: unknown): UserRole | null {
  if (!isUserWithRole(user)) return null
  if (user.role && userRoles.includes(user.role)) return user.role

  // The startup migration assigns persisted roles to legacy accounts. Until it
  // completes, use least privilege rather than accidentally escalating access.
  return 'staff'
}

export function hasRole(user: unknown, allowed: readonly UserRole[]): boolean {
  const role = getUserRole(user)
  return role ? allowed.includes(role) : false
}

export const ownerOnly = ({ req }: { req: PayloadRequest }): boolean =>
  hasRole(req.user, ['owner'])
export const ownerFieldOnly: FieldAccess = ({ req }) => hasRole(req.user, ['owner'])
export const ownerOrManager = ({ req }: { req: PayloadRequest }): boolean =>
  hasRole(req.user, ['owner', 'manager'])
export const appointmentTeam = ({ req }: { req: PayloadRequest }): boolean =>
  hasRole(req.user, ['owner', 'manager', 'staff'])

export const ownerOrFirstUser = async ({ req }: { req: PayloadRequest }): Promise<boolean> => {
  if (hasRole(req.user, ['owner'])) return true
  const result = await req.payload.count({ collection: 'users', overrideAccess: true })
  return result.totalDocs === 0
}
