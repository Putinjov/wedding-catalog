import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { formatCurrency, formatFittingFee } from '@/config/site'
import type { DressMode } from '@/lib/catalogue'
import { isUnavailableForMode } from '@/lib/dress-utils'
import type { Dress } from '@/payload-types'

function fittingHref(dress: Dress, mode: DressMode): string {
  return `/book-a-fitting?dress=${encodeURIComponent(dress.slug)}&purpose=${mode}`
}

function enquiryHref(dress: Dress): string {
  return `/contact?dress=${encodeURIComponent(dress.slug)}&purpose=buy`
}

function PriceDetails({ dress, mode }: { dress: Dress; mode: DressMode }) {
  if (mode === 'buy') {
    const salePrice = dress.forSale && dress.salePrice != null ? dress.salePrice : null
    const previousSalePrice = dress.previousSalePrice
    const hasPreviousPrice =
      salePrice != null &&
      previousSalePrice != null &&
      previousSalePrice > salePrice

    return (
      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sale price</p>
        {salePrice != null ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <p className="font-serif text-4xl text-brand-deep-lavender">
              {formatCurrency(salePrice)}
            </p>
            {hasPreviousPrice ? (
              <del className="text-sm text-muted-foreground">
                {formatCurrency(previousSalePrice)}
              </del>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 font-serif text-3xl text-brand-deep-lavender">Price on request</p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6">
      <p className="font-serif text-4xl text-brand-deep-lavender">
        {dress.rentalPrice != null
          ? `From ${formatCurrency(dress.rentalPrice)} rental`
          : 'Rental price on request'}
      </p>
      <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex justify-between gap-4 border-b border-brand-warm-border/70 pb-2">
          <dt>Security deposit</dt>
          <dd className="text-right text-foreground">
            {dress.securityDeposit != null
              ? formatCurrency(dress.securityDeposit)
              : 'Confirmed during booking'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Standard rental period</dt>
          <dd className="text-right text-foreground">{dress.rentalPeriodDays ?? 4} days</dd>
        </div>
      </dl>
    </div>
  )
}

function UnavailableMessage({ mode }: { mode: DressMode }) {
  return (
    <p className="mt-8 border border-brand-warm-border bg-brand-blush/30 px-4 py-3 text-sm leading-6 text-foreground">
      {mode === 'buy'
        ? 'This dress is currently unavailable for purchase.'
        : 'This dress is currently unavailable for rental.'}
    </p>
  )
}

export function DressPricePanel({ dress, mode }: { dress: Dress; mode: DressMode }) {
  const unavailable = isUnavailableForMode(dress, mode)

  return (
    <section aria-label={`${mode} details`}>
      <PriceDetails dress={dress} mode={mode} />

      {unavailable ? (
        <UnavailableMessage mode={mode} />
      ) : (
        <div className="mt-8 flex flex-col items-start gap-3">
          {mode === 'buy' ? (
            <>
              <Button asChild className="rounded-sm px-6" size="lg">
                <Link href={fittingHref(dress, mode)}>Book a fitting · {formatFittingFee()}</Link>
              </Button>
              <Link
                className="text-sm font-medium text-brand-deep-lavender underline decoration-brand-antique-gold underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2"
                href={enquiryHref(dress)}
              >
                Enquire about this dress
              </Link>
            </>
          ) : (
            <>
              <Button asChild className="rounded-sm px-6" size="lg">
                <Link href={fittingHref(dress, mode)}>Check rental availability</Link>
              </Button>
              <Link
                className="text-sm font-medium text-brand-deep-lavender underline decoration-brand-antique-gold underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2"
                href={fittingHref(dress, mode)}
              >
                Book a fitting · {formatFittingFee()}
              </Link>
            </>
          )}
        </div>
      )}
    </section>
  )
}
