import { requireManagerSession } from '@/lib/manager/session'
import { ManagerClients } from '@/components/manager/clients'

export const dynamic = 'force-dynamic'
export default async function ClientsPage() {
  await requireManagerSession()
  return <ManagerClients />
}
