import type { Metadata } from 'next'

import { CataloguePage } from '@/components/boutique/catalogue-page'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  alternates: {
    canonical: '/buy',
  },
  description: `Explore wedding dresses available to purchase from ${siteConfig.name}.`,
  title: 'Buy wedding dresses',
}

export default function BuyPage() {
  return <CataloguePage mode="buy" />
}
