import Link from 'next/link'

import { Media } from '@/components/Media'
import { formatCurrency } from '@/config/site'
import type { DressDisplayMode } from '@/lib/catalogue'
import type { Dress, Media as MediaType } from '@/payload-types'

function getImage(resource: Dress['mainImage']): MediaType | null {
  return typeof resource === 'object' && resource !== null ? resource : null
}

function getImageAlt(dress: Dress, image: MediaType | null): string {
  return image?.alt || dress.name
}

export function DressCard({
  dress,
  mode = 'all',
}: {
  dress: Dress
  mode?: DressDisplayMode
}) {
  const image = getImage(dress.mainImage)
  const salePrice =
    (mode === 'all' || mode === 'buy') && dress.forSale && dress.salePrice != null
      ? dress.salePrice
      : null
  const rentalPrice =
    (mode === 'all' || mode === 'rent') && dress.availableForRent && dress.rentalPrice != null
      ? dress.rentalPrice
      : null
  const ctaLabel = mode === 'rent' ? 'View rental' : 'View dress'

  return (
    <article className="group">
      <Link
        className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        href={`/dresses/${dress.slug}`}
      >
        <div className="aspect-[3/4] overflow-hidden bg-secondary">
          {image ? (
            <Media
              alt={getImageAlt(dress, image)}
              className="relative block h-full w-full"
              fill
              imgClassName="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
              pictureClassName="relative block h-full w-full"
              resource={image}
              size="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Image coming soon
            </div>
          )}
        </div>
        <div className="mt-4">
          <h3 className="font-serif text-2xl leading-tight text-foreground">{dress.name}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {salePrice != null ? (
              <span>Sale {formatCurrency(salePrice)}</span>
            ) : null}
            {rentalPrice != null ? (
              <span>From {formatCurrency(rentalPrice)} rental</span>
            ) : null}
          </div>
          <span className="mt-4 inline-flex text-sm font-medium text-brand-deep-lavender underline decoration-brand-antique-gold underline-offset-4">
            {ctaLabel}
          </span>
        </div>
      </Link>
    </article>
  )
}
