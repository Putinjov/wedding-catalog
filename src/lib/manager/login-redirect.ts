import { hasRole } from '@/access/roles'

export function shouldRedirectManagerToWorkspace(user: unknown, segments?: string[]): boolean {
  return hasRole(user, ['manager']) &&
    (!segments?.length || (segments.length === 1 && segments[0] === 'login'))
}
