import type { Metadata } from 'next'

import { CataloguePage } from '@/components/boutique/catalogue-page'
import { siteConfig } from '@/config/site'
import type { CatalogueSearchParams } from '@/lib/catalogue'

export const metadata: Metadata = {
  alternates: {
    canonical: '/buy',
  },
  description: `Explore wedding dresses available to purchase from ${siteConfig.name}.`,
  title: 'Buy wedding dresses',
}

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>
}) {
  return <CataloguePage mode="buy" searchParams={await searchParams} />
}
