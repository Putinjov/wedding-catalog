import type { Metadata } from 'next'

import { CataloguePage } from '@/components/boutique/catalogue-page'
import type { CatalogueSearchParams } from '@/lib/catalogue'
import { getCatalogueMetadata } from '@/lib/catalogue-metadata'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>
}): Promise<Metadata> {
  return getCatalogueMetadata('buy', await searchParams)
}

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>
}) {
  return <CataloguePage mode="buy" searchParams={await searchParams} />
}
