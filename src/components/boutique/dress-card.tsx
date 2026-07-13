import Link from 'next/link'

import { Media } from '@/components/Media'
import type { Dress, Media as MediaType } from '@/payload-types'

const euroFormatter = new Intl.NumberFormat('en-IE', {
  currency: 'EUR',
  style: 'currency',
})

function getImage(resource: Dress['mainImage']): MediaType | null {
  return typeof resource === 'object' && resource !== null ? resource : null
}

function getImageAlt(dress: Dress, image: MediaType | null): string {
  return image?.alt || dress.name
}

export function DressCard({ dress }: { dress: Dress }) {
  const image = getImage(dress.mainImage)

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
            {dress.forSale && dress.salePrice != null ? (
              <span>Sale {euroFormatter.format(dress.salePrice)}</span>
            ) : null}
            {dress.availableForRent && dress.rentalPrice != null ? (
              <span>Rental {euroFormatter.format(dress.rentalPrice)}</span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  )
}
