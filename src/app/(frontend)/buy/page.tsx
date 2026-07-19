import type { Metadata } from 'next'

import { CataloguePage } from '@/components/boutique/catalogue-page'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Buy wedding dresses',
  description: `Explore wedding dresses available to purchase from ${siteConfig.name}.`,
}

export default function BuyPage() {
  return <CataloguePage mode="buy" />
}
