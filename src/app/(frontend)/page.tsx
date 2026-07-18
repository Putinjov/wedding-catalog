import type { Metadata } from 'next'

import { FeaturedDresses } from '@/components/boutique/featured-dresses'
import { FittingCallout } from '@/components/boutique/fitting-callout'
import { HeroSection } from '@/components/boutique/hero-section'
import { JourneySplit } from '@/components/boutique/journey-split'
import { NewsletterSection } from '@/components/boutique/newsletter-section'
import { ServiceHighlights } from '@/components/boutique/service-highlights'
import { siteConfig } from '@/config/site'
import { getFeaturedDresses } from '@/lib/getFeaturedDresses'
import type { Media } from '@/payload-types'

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.tagline,
}

function getHeroImage(dresses: Awaited<ReturnType<typeof getFeaturedDresses>>): Media | null {
  return dresses.find((dress) => dress.media.main)?.media.main?.full ?? null
}

export default async function HomePage() {
  const featuredDresses = await getFeaturedDresses()
  const heroImage = getHeroImage(featuredDresses)

  return (
    <main>
      <HeroSection image={heroImage} />
      <JourneySplit />
      <ServiceHighlights />
      <FeaturedDresses dresses={featuredDresses} />
      <FittingCallout />
      <NewsletterSection />
    </main>
  )
}
