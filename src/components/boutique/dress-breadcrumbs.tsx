import Link from 'next/link'

import { getCanonicalOrigin } from '@/config/site-url'
import type { DressMode } from '@/lib/catalogue'
import { getDressPath } from '@/utilities/dress-routing'

export function DressBreadcrumbs({
  dressName,
  dressSlug,
  mode,
  returnTo,
}: {
  dressName: string
  dressSlug: string
  mode: DressMode
  returnTo: string
}) {
  const catalogueLabel = mode === 'buy' ? 'Buy' : 'Rent'
  const canonicalOrigin = getCanonicalOrigin()
  const canonicalDressURL = `${canonicalOrigin}${getDressPath(dressSlug)}`
  const catalogueURL = `${canonicalOrigin}/${mode}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        item: canonicalOrigin,
        name: 'Home',
        position: 1,
      },
      {
        '@type': 'ListItem',
        item: catalogueURL,
        name: catalogueLabel,
        position: 2,
      },
      {
        '@type': 'ListItem',
        item: canonicalDressURL,
        name: dressName,
        position: 3,
      },
    ],
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="container pt-6 md:pt-8">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <li>
            <Link className="underline-offset-4 hover:underline" href="/">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link className="underline-offset-4 hover:underline" href={returnTo}>
              {catalogueLabel}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {dressName}
          </li>
        </ol>
        <Link
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-brand-deep-lavender underline decoration-brand-antique-gold underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={returnTo}
        >
          Back to {catalogueLabel.toLowerCase()} catalogue
        </Link>
      </nav>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        type="application/ld+json"
      />
    </>
  )
}
