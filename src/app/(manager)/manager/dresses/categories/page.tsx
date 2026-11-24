import { redirect } from 'next/navigation'
import { hasRole } from '@/access/roles'
import { requireManagerSession } from '@/lib/manager/session'
import { ManagerCategories } from '@/components/manager/categories'

export const dynamic = 'force-dynamic'
export default async function CategoriesPage() {
  const { user } = await requireManagerSession()
  if (!hasRole(user, ['owner', 'manager'])) redirect('/manager')
  return <ManagerCategories />
}
