import Link from 'next/link'

import { Media } from '@/components/Media'
import { Badge } from '@/components/ui/badge'
import { defaultImageQuality } from '@/config/images'
import { formatCurrency } from '@/config/site'
import type { DressDisplayMode } from '@/lib/catalogue'
import type { DressWithMedia } from '@/lib/dress-media'
import {
  getAvailabilityLabel,
  getRelationshipLabel,
  getSupportedDressModes,
  isDressAvailableForMode,
} from '@/lib/dress-utils'
import { getDressHref } from '@/utilities/dress-routing'

export function DressCard({
  dress,
  mode = 'all',
  returnTo,
  source,
}: {
  dress: DressWithMedia
  mode?: DressDisplayMode
  returnTo?: string | null
  source?: 'related' | null
}) {
  const image = dress.media.main
  const salePrice =
    (mode === 'all' || mode === 'buy') &&
    isDressAvailableForMode(dress, 'buy') &&
    dress.salePrice != null
      ? dress.salePrice
      : null
  const rentalPrice =
    (mode === 'all' || mode === 'rent') &&
    isDressAvailableForMode(dress, 'rent') &&
    dress.rentalPrice != null
      ? dress.rentalPrice
      : null
  const previousSalePrice =
    salePrice !== null &&
    dress.previousSalePrice != null &&
    dress.previousSalePrice > salePrice
      ? dress.previousSalePrice
      : null
  const designer = getRelationshipLabel(dress.designer)
  const silhouette = getRelationshipLabel(dress.silhouette)
  const statusModes = mode === 'all' ? getSupportedDressModes(dress) : [mode]
  const isSold =
    dress.saleStatus === 'sold' &&
    (mode === 'buy' || (mode === 'all' && dress.rentalStatus === 'not-for-rent'))
  const href = getDressHref({
    mode: mode === 'all' ? null : mode,
    returnTo,
    slug: dress.slug,
    source,
  })

  return (
    <article className="group">
      <Link
        className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        data-attribution={source ?? undefined}
        href={href}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          {image ? (
            <Media
              alt={image.alt || dress.name}
              className="relative block h-full w-full"
              fill
              imgClassName="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
              pictureClassName="relative block h-full w-full"
              quality={defaultImageQuality}
              resource={image.card}
              size="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Image coming soon
            </div>
          )}
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
            {statusModes.map((statusMode) => (
              <Badge
                className="border-0 bg-background/92 text-foreground shadow-sm backdrop-blur-sm"
                key={statusMode}
                variant="outline"
              >
                {getAvailabilityLabel(dress, statusMode)}
              </Badge>
            ))}
            {dress.featured ? (
              <Badge className="border-0 bg-brand-deep-lavender text-white">Featured</Badge>
            ) : null}
            {dress.condition === 'new' ? (
              <Badge className="border-0 bg-brand-antique-gold text-foreground">New</Badge>
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          {designer || silhouette ? (
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {[designer, silhouette].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <h3 className="font-serif text-2xl leading-tight text-foreground">{dress.name}</h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {salePrice != null ? (
              <>
                <span className={mode === 'buy' ? 'text-lg font-semibold text-foreground' : ''}>
                  {formatCurrency(salePrice)}
                </span>
                {previousSalePrice !== null ? (
                  <span className="line-through">
                    <span className="sr-only">Previous price </span>
                    {formatCurrency(previousSalePrice)}
                  </span>
                ) : null}
              </>
            ) : null}
            {(mode === 'all' || mode === 'buy') &&
            isDressAvailableForMode(dress, 'buy') &&
            dress.salePriceOnRequest ? (
              <span className={mode === 'buy' ? 'text-base font-semibold text-foreground' : ''}>
                Price on request
              </span>
            ) : null}
            {rentalPrice != null ? (
              <span className={mode === 'rent' ? 'text-lg font-semibold text-foreground' : ''}>
                Rent from {formatCurrency(rentalPrice)}
              </span>
            ) : null}
          </div>
          {!isSold ? (
            <span className="mt-4 inline-flex text-sm font-medium text-brand-deep-lavender underline decoration-brand-antique-gold underline-offset-4">
              View dress
            </span>
          ) : null}
        </div>
      </Link>
      {isSold ? (
        <Link
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-brand-deep-lavender underline decoration-brand-antique-gold underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/buy#catalogue-results"
        >
          View similar dresses
        </Link>
      ) : null}
    </article>
  )
}
