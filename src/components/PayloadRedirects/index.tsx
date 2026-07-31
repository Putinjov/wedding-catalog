import type React from 'react'
import type { Dress, Page, Post } from '@/payload-types'

import { getCachedRedirects } from '@/utilities/getRedirects'
import { normalizeInternalRedirectPath } from '@/utilities/redirects'
import { notFound, permanentRedirect, redirect } from 'next/navigation'

interface Props {
  disableNotFound?: boolean
  url: string
}

/* This component helps us with SSR based dynamic redirects */
export const PayloadRedirects: React.FC<Props> = async ({ disableNotFound, url }) => {
  const redirects = await getCachedRedirects()()

  const redirectItem = redirects.find((redirect) => redirect.from === url)

  if (redirectItem) {
    const customURL =
      redirectItem.to?.type === 'custom'
        ? normalizeInternalRedirectPath(redirectItem.to.url)
        : null
    const reference =
      redirectItem.to?.type === 'reference' ? redirectItem.to.reference : null
    const document =
      reference && typeof reference.value === 'object'
        ? (reference.value as Dress | Page | Post)
        : null
    const referenceURL =
      reference && document?.slug
        ? `${reference.relationTo === 'pages' ? '' : `/${reference.relationTo}`}/${encodeURIComponent(document.slug)}`
        : null
    const redirectURL = customURL ?? referenceURL

    if (redirectURL) {
      if (redirectItem.type === '308') {
        permanentRedirect(redirectURL)
      }

      redirect(redirectURL)
    }
  }

  if (disableNotFound) return null

  notFound()
}
