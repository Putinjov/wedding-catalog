import type { Metadata } from 'next'

import { JourneySplit } from '@/components/boutique/journey-split'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: `Wedding dresses | ${siteConfig.name}`,
  description: 'Choose whether you would like to buy or rent your wedding dress.',
}

export default function DressesPage() {
  return (
    <main>
      <JourneySplit
        description={`Browse the ${siteConfig.name} collection by the way you want to wear your dress.`}
        headingLevel="h1"
        title="Choose your dress journey"
      />
    </main>
  )
}
