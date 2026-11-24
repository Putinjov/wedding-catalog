/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { shouldRedirectManagerToWorkspace } from '@/lib/manager/login-redirect'

import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

// Keep this role-aware landing guard when updating Payload's generated route.
const Page = async ({ params, searchParams }: Args) => {
  const { segments } = await params
  if (!segments?.length || (segments.length === 1 && segments[0] === 'login')) {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    if (shouldRedirectManagerToWorkspace(user, segments)) redirect('/manager')
  }
  return RootPage({ config, params, searchParams, importMap })
}

export default Page
