import { requireManagerSession } from '@/lib/manager/session'
import { ManagerHome } from '@/components/manager/home'

export const dynamic = 'force-dynamic'
export default async function HomePage() {
  await requireManagerSession()
  return <ManagerHome />
}
