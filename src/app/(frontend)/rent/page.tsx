import type { Metadata } from 'next'

import { CataloguePage } from '@/components/boutique/catalogue-page'
import type { CatalogueSearchParams } from '@/lib/catalogue'
import { getCatalogueMetadata } from '@/lib/catalogue-metadata'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>
}): Promise<Metadata> {
  return getCatalogueMetadata('rent', await searchParams)
}

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>
}) {
  return <CataloguePage mode="rent" searchParams={await searchParams} />
}
