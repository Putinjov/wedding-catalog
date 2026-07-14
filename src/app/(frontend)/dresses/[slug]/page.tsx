import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DressDetail } from '@/components/boutique/dress-detail'
import { siteConfig } from '@/config/site'
import { getDressBySlug, getRelatedDresses } from '@/lib/getDress'
import type { DressMode } from '@/lib/catalogue'

type Args = {
  params: Promise<{
    slug?: string
  }>
  searchParams: Promise<{
    mode?: string | string[]
  }>
}

function getRequestedMode(mode: string | string[] | undefined): DressMode | null {
  const requestedMode = Array.isArray(mode) ? mode[0] : mode
  return requestedMode === 'buy' || requestedMode === 'rent' ? requestedMode : null
}

function getInitialMode(
  dress: NonNullable<Awaited<ReturnType<typeof getDressBySlug>>>,
  requestedMode: DressMode | null,
): DressMode {
  if (requestedMode === 'buy' && dress.forSale) {
    return 'buy'
  }

  if (requestedMode === 'rent' && dress.availableForRent) {
    return 'rent'
  }

  return dress.forSale ? 'buy' : 'rent'
}

export default async function DressPage({ params: paramsPromise, searchParams }: Args) {
  const { slug = '' } = await paramsPromise
  const dress = await getDressBySlug(decodeURIComponent(slug))

  if (!dress || (!dress.forSale && !dress.availableForRent)) {
    notFound()
  }

  const { mode } = await searchParams
  const initialMode = getInitialMode(dress, getRequestedMode(mode))
  const relatedDresses = await getRelatedDresses({ dress, mode: initialMode })

  return (
    <DressDetail dress={dress} initialMode={initialMode} relatedDresses={relatedDresses} />
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const dress = await getDressBySlug(decodeURIComponent(slug))

  if (!dress || (!dress.forSale && !dress.availableForRent)) {
    return {
      title: `Dress not found | ${siteConfig.name}`,
    }
  }

  const title = dress.meta?.title || `${dress.name} | ${siteConfig.name}`
  const description =
    dress.meta?.description || dress.shortDescription || `${dress.name} from ${siteConfig.name}.`
  const image =
    typeof dress.meta?.image === 'object' && dress.meta.image?.url ? dress.meta.image.url : null

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ alt: dress.name, url: image }] } : {}),
    },
  }
}
