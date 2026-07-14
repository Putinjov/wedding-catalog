import { DressDetails } from '@/components/boutique/dress-details'
import { DressGallery, type DressGalleryImage } from '@/components/boutique/dress-gallery'
import { DressModeSelector } from '@/components/boutique/dress-mode-selector'
import { DressPricePanel } from '@/components/boutique/dress-price-panel'
import { RelatedDresses } from '@/components/boutique/related-dresses'
import type { DressMode } from '@/lib/catalogue'
import {
  getAvailabilityLabel,
  getConditionLabel,
  getPopulatedMedia,
  getRelationshipLabel,
} from '@/lib/dress-utils'
import type { Dress } from '@/payload-types'

function getGalleryImages(dress: Dress): DressGalleryImage[] {
  const images: DressGalleryImage[] = []
  const seenIds = new Set<string>()
  const mainImage = getPopulatedMedia(dress.mainImage)

  if (mainImage) {
    images.push({
      alt: mainImage.alt || dress.name,
      resource: mainImage,
    })
    seenIds.add(mainImage.id)
  }

  for (const galleryImage of dress.gallery ?? []) {
    const resource = getPopulatedMedia(galleryImage.image)
    if (!resource || seenIds.has(resource.id)) {
      continue
    }

    images.push({
      alt: galleryImage.alt || resource.alt || dress.name,
      resource,
    })
    seenIds.add(resource.id)
  }

  return images
}

function getAvailableModes(dress: Dress): DressMode[] {
  return [
    ...(dress.forSale ? (['buy'] as const) : []),
    ...(dress.availableForRent ? (['rent'] as const) : []),
  ]
}

export function DressDetail({
  dress,
  initialMode,
  relatedDresses,
}: {
  dress: Dress
  initialMode: DressMode
  relatedDresses: Dress[]
}) {
  const designer = getRelationshipLabel(dress.designer)
  const modes = getAvailableModes(dress)
  const availabilityLabel = getAvailabilityLabel(dress.availabilityStatus)

  return (
    <>
      <main className="container py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:gap-16">
          <DressGallery images={getGalleryImages(dress)} name={dress.name} />

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border-b border-brand-warm-border pb-8">
              {designer ? (
                <p className="text-xs uppercase tracking-[0.24em] text-brand-deep-lavender">
                  {designer}
                </p>
              ) : null}
              <h1 className="mt-3 font-serif text-5xl leading-[0.95] text-foreground md:text-6xl">
                {dress.name}
              </h1>
              {dress.collectionName ? (
                <p className="mt-4 text-sm uppercase tracking-[0.16em] text-muted-foreground">
                  {dress.collectionName}
                </p>
              ) : null}
              {dress.shortDescription ? (
                <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
                  {dress.shortDescription}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                <span className="border border-brand-sage px-3 py-1 text-foreground">
                  {availabilityLabel}
                </span>
                {dress.condition !== 'new' ? (
                  <span className="text-muted-foreground">
                    Condition: {getConditionLabel(dress.condition)}
                  </span>
                ) : null}
              </div>
            </div>

            <DressModeSelector initialMode={initialMode} modes={modes} />
            <DressPricePanel dress={dress} mode={initialMode} />
            <DressDetails dress={dress} />
          </aside>
        </div>
      </main>

      <RelatedDresses dresses={relatedDresses} mode={initialMode} />
    </>
  )
}
