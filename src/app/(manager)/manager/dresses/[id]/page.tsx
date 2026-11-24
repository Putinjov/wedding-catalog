import { redirect } from 'next/navigation'
import { hasRole } from '@/access/roles'
import { requireManagerSession } from '@/lib/manager/session'
import { DressEditor } from '@/components/manager/dress-editor'

export const dynamic = 'force-dynamic'
export default async function DressPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireManagerSession()
  if (!hasRole(user, ['owner', 'manager'])) redirect('/manager')
  const { id } = await params
  return <DressEditor id={id} />
}
