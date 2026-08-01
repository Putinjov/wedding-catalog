import { BookingDialog } from '@/components/booking/booking-dialog'
import { buttonVariants } from '@/components/ui/button'
import { formatCurrency, formatFittingFee } from '@/config/site'
import { getBookingDateBounds } from '@/lib/booking/date'
import type { DressMode } from '@/lib/catalogue'
import {
  getAvailabilityLabel,
  isDressAvailableForMode,
  isUnavailableForMode,
} from '@/lib/dress-utils'
import type { Dress } from '@/payload-types'

function fittingHref(dress: Dress, mode: DressMode): string {
  return `/book-a-fitting?dress=${encodeURIComponent(dress.slug)}&purpose=${mode}`
}

function PriceDetails({ dress, mode }: { dress: Dress; mode: DressMode }) {
  if (mode === 'buy') {
    const salePrice = isDressAvailableForMode(dress, 'buy') ? dress.salePrice : null
    const previousSalePrice = dress.previousSalePrice
    const hasPreviousPrice =
      salePrice != null && previousSalePrice != null && previousSalePrice > salePrice

    return (
      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Purchase terms</p>
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
        ) : dress.salePriceOnRequest && isDressAvailableForMode(dress, 'buy') ? (
          <p className="mt-2 font-serif text-3xl text-brand-deep-lavender">Price on request</p>
        ) : null}
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          The final alteration scope and collection arrangements are agreed during your private fitting.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rental terms</p>
      <p className="mt-2 font-serif text-4xl text-brand-deep-lavender">
        {dress.rentalPrice != null
          ? `From ${formatCurrency(dress.rentalPrice)}`
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
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Final availability, alterations, collection and return arrangements are confirmed during booking.
      </p>
    </div>
  )
}

function UnavailableMessage({ dress, mode }: { dress: Dress; mode: DressMode }) {
  const label = getAvailabilityLabel(dress, mode)
  const message =
    mode === 'buy' && dress.saleStatus === 'sold'
      ? 'This dress has been sold and cannot be purchased.'
      : mode === 'buy'
        ? 'This dress cannot currently be booked for purchase.'
        : 'This dress cannot currently be booked for rental.'

  return (
    <div className="mt-8 border border-brand-warm-border bg-brand-blush/30 px-4 py-3 text-sm leading-6 text-foreground">
      <p className="font-medium">{label}</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </div>
  )
}

export function DressPricePanel({ dress, mode }: { dress: Dress; mode: DressMode }) {
  const unavailable = isUnavailableForMode(dress, mode)
  const bounds = getBookingDateBounds()
  const selectedDress = {
    id: dress.id,
    name: dress.name,
    slug: dress.slug,
    supportsBuy: isDressAvailableForMode(dress, 'buy'),
    supportsRent: isDressAvailableForMode(dress, 'rent'),
  }
  const primaryClassName = buttonVariants({ className: 'rounded-sm px-6', size: 'lg' })
  const secondaryClassName =
    'min-h-11 text-sm font-medium text-brand-deep-lavender underline decoration-brand-antique-gold underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2'
  const primaryLabel =
    mode === 'buy' ? `Book a fitting · ${formatFittingFee()}` : 'Check rental availability'
  const mobileClassName =
    'fixed inset-x-0 bottom-0 z-40 flex min-h-[calc(3.5rem+env(safe-area-inset-bottom))] w-full items-center justify-center border-t border-brand-warm-border bg-brand-deep-lavender px-6 pb-[env(safe-area-inset-bottom)] text-sm font-semibold text-white shadow-[0_-8px_24px_rgba(44,38,33,0.12)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-antique-gold lg:hidden'

  return (
    <section aria-label={`${mode} details`}>
      <PriceDetails dress={dress} mode={mode} />

      {unavailable ? (
        <UnavailableMessage dress={dress} mode={mode} />
      ) : (
        <div className="mt-8 flex flex-col items-start gap-3">
          <BookingDialog
            dialogID={`dress-${dress.id}-${mode}`}
            fallbackHref={fittingHref(dress, mode)}
            initialPurpose={mode}
            maxDate={bounds.maxDate}
            minDate={bounds.minDate}
            mobileClassName={mobileClassName}
            mobileLabel={primaryLabel}
            primaryClassName={primaryClassName}
            primaryLabel={primaryLabel}
            secondaryClassName={mode === 'rent' ? secondaryClassName : undefined}
            secondaryLabel={mode === 'rent' ? `Book a fitting · ${formatFittingFee()}` : undefined}
            selectedDress={selectedDress}
          />
        </div>
      )}
    </section>
  )
}
