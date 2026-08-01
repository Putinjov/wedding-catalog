import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { DressDetail } from '@/components/boutique/dress-detail'
import { formatSiteTitle, siteConfig } from '@/config/site'
import { getDressBySlug, getRelatedDresses } from '@/lib/getDress'
import { getPublicDressRedirect } from '@/lib/dress-redirects'
import { getRequestedDressMode, type DressMode } from '@/lib/catalogue'
import { getSupportedDressModes, supportsDressMode } from '@/lib/dress-utils'
import { normalizeCatalogueReturnTo } from '@/utilities/dress-routing'

type Args = {
  params: Promise<{
    slug?: string
  }>
  searchParams: Promise<{
    mode?: string | string[]
    returnTo?: string | string[]
  }>
}

function getInitialMode(
  dress: NonNullable<Awaited<ReturnType<typeof getDressBySlug>>>,
  requestedMode: DressMode | null,
): DressMode {
  if (requestedMode === 'buy' && supportsDressMode(dress, 'buy')) {
    return 'buy'
  }

  if (requestedMode === 'rent' && supportsDressMode(dress, 'rent')) {
    return 'rent'
  }

  return getSupportedDressModes(dress)[0] ?? 'buy'
}

export default async function DressPage({ params: paramsPromise, searchParams }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const dress = await getDressBySlug(decodedSlug)

  if (!dress) {
    const { mode, returnTo } = await searchParams
    const requestedMode = getRequestedDressMode(mode)
    const redirectURL = await getPublicDressRedirect(
      decodedSlug,
      requestedMode,
      normalizeCatalogueReturnTo(returnTo, requestedMode ?? undefined),
    )

    if (redirectURL) {
      permanentRedirect(redirectURL)
    }

    notFound()
  }

  if (getSupportedDressModes(dress).length === 0) {
    notFound()
  }

  const { mode, returnTo } = await searchParams
  const initialMode = getInitialMode(dress, getRequestedDressMode(mode))
  const normalizedReturnTo =
    normalizeCatalogueReturnTo(returnTo, initialMode) ?? `/${initialMode}#catalogue-results`
  const relatedDresses = await getRelatedDresses({ dress, mode: initialMode })

  return (
    <DressDetail
      dress={dress}
      initialMode={initialMode}
      relatedDresses={relatedDresses}
      returnTo={normalizedReturnTo}
    />
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const dress = await getDressBySlug(decodeURIComponent(slug))

  if (!dress || getSupportedDressModes(dress).length === 0) {
    return {
      title: {
        absolute: `Dress not found | ${siteConfig.name}`,
      },
    }
  }

  const title = formatSiteTitle(dress.meta?.title || dress.name)
  const description =
    dress.meta?.description || dress.shortDescription || `${dress.name} from ${siteConfig.name}.`
  const image =
    typeof dress.meta?.image === 'object' && dress.meta.image?.url ? dress.meta.image.url : null

  return {
    alternates: {
      canonical: `/dresses/${encodeURIComponent(dress.slug)}`,
    },
    description,
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ alt: dress.name, url: image }] } : {}),
    },
    title: {
      absolute: title,
    },
  }
}
