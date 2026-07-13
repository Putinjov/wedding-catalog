import type { Metadata } from 'next'

import { FeaturedDresses } from '@/components/boutique/featured-dresses'
import { FittingCallout } from '@/components/boutique/fitting-callout'
import { HeroSection } from '@/components/boutique/hero-section'
import { NewsletterSection } from '@/components/boutique/newsletter-section'
import { ServiceHighlights } from '@/components/boutique/service-highlights'
import { getFeaturedDresses } from '@/lib/getFeaturedDresses'
import type { Media } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Wedding Boutique',
  description: 'Luxury wedding dresses available to buy or rent, selected for modern brides.',
}

function getHeroImage(dresses: Awaited<ReturnType<typeof getFeaturedDresses>>): Media | null {
  const dressWithImage = dresses.find((dress) => typeof dress.mainImage === 'object')

  if (!dressWithImage || typeof dressWithImage.mainImage !== 'object') {
    return null
  }

  return dressWithImage.mainImage
}

export default async function HomePage() {
  const featuredDresses = await getFeaturedDresses()
  const heroImage = getHeroImage(featuredDresses)

  return (
    <main>
      <HeroSection image={heroImage} />
      <ServiceHighlights />
      <FeaturedDresses dresses={featuredDresses} />
      <FittingCallout />
      <NewsletterSection />
    </main>
  )
}
