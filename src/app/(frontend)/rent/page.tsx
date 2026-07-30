import type { Metadata } from 'next'

import { CataloguePage } from '@/components/boutique/catalogue-page'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  alternates: {
    canonical: '/rent',
  },
  description: `Browse wedding dresses available to rent from ${siteConfig.name}.`,
  title: 'Rent wedding dresses',
}

export default function RentPage() {
  return <CataloguePage mode="rent" />
}
