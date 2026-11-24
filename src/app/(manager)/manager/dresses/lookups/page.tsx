import { redirect } from 'next/navigation'
import { hasRole } from '@/access/roles'
import { requireManagerSession } from '@/lib/manager/session'
import { ManagerLookups } from '@/components/manager/lookups'

export const dynamic = 'force-dynamic'
export default async function LookupsPage() {
  const { user } = await requireManagerSession()
  if (!hasRole(user, ['owner', 'manager'])) redirect('/manager')
  return <ManagerLookups />
}
