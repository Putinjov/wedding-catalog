import { redirect } from 'next/navigation'
import { hasRole } from '@/access/roles'
import { requireManagerSession } from '@/lib/manager/session'
import { DressTranslation } from '@/components/manager/dress-translation'

export const dynamic = 'force-dynamic'
export default async function TranslationPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireManagerSession()
  if (!hasRole(user, ['owner', 'manager'])) redirect('/manager')
  const { id } = await params
  return <DressTranslation key={id} id={id} />
}
