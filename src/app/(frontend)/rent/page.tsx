import type { Metadata } from 'next'

import { CataloguePage } from '@/components/boutique/catalogue-page'
import { siteConfig } from '@/config/site'
import type { CatalogueSearchParams } from '@/lib/catalogue'

export const metadata: Metadata = {
  alternates: {
    canonical: '/rent',
  },
  description: `Browse wedding dresses available to rent from ${siteConfig.name}.`,
  title: 'Rent wedding dresses',
}

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>
}) {
  return <CataloguePage mode="rent" searchParams={await searchParams} />
}
