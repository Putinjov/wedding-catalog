import { redirect } from 'next/navigation'
import { hasRole } from '@/access/roles'
import { requireManagerSession } from '@/lib/manager/session'
import { ManagerDresses } from '@/components/manager/dresses'

export const dynamic = 'force-dynamic'
export default async function DressesPage() {
  const { user } = await requireManagerSession()
  if (!hasRole(user, ['owner', 'manager'])) redirect('/manager')
  return <ManagerDresses />
}
