import Link from 'next/link'
import { getUserRole } from '@/access/roles'
import { requireManagerSession } from '@/lib/manager/session'
import { ManagerSignOut } from '@/components/manager/sign-out'

export const dynamic = 'force-dynamic'
export default async function MorePage() {
  const { user } = await requireManagerSession()
  const role = getUserRole(user)
  return <main className="manager-section">
    <h1>More</h1>
    <section className="manager-panel"><h2>My account</h2><p>{user.email}</p><p className="manager-muted">{role}</p></section>
    <section className="manager-panel"><h2>Salon operations</h2>
      <Link className="manager-action" href="/manager">Calendar &amp; availability</Link>
      <Link className="manager-action" href="/manager/clients">Clients</Link>
      {(role === 'owner' || role === 'manager') && <Link className="manager-action" href="/manager/dresses">Dress catalogue</Link>}
      <Link className="manager-action" href="/manager?new=1">New appointment</Link>
    </section>
    {role === 'owner' && <section className="manager-panel"><h2>Technical administration</h2><Link className="manager-action" href="/admin">Payload Admin</Link></section>}
    <ManagerSignOut />
  </main>
}
