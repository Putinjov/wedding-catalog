import type { Metadata } from 'next'

import { CataloguePage } from '@/components/boutique/catalogue-page'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: `Rent wedding dresses | ${siteConfig.name}`,
  description: `Browse wedding dresses available to rent from ${siteConfig.name}.`,
}

export default function RentPage() {
  return <CataloguePage mode="rent" />
}
