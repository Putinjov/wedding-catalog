import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { hasRole } from '@/access/roles'

export async function requireManagerSession() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || !hasRole(user, ['owner', 'manager', 'staff'])) redirect('/admin/login')
  return { payload, user }
}
