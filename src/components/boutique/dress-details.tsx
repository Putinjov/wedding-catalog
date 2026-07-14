import RichText from '@/components/RichText'
import { formatCurrency, formatFittingFee } from '@/config/site'
import { getConditionLabel, getRelationshipLabel, getRelationshipLabels } from '@/lib/dress-utils'
import type { Dress } from '@/payload-types'

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null
  }

  return (
    <div className="grid grid-cols-[minmax(7rem,0.7fr)_1fr] gap-4 border-b border-brand-warm-border/70 py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

function DetailsSection({ dress }: { dress: Dress }) {
  const sizeLabels = getRelationshipLabels(dress.sizes)
  const colorLabels = getRelationshipLabels(dress.colors)
  const fabricLabels = getRelationshipLabels(dress.fabrics)

  return (
    <details className="group border-t border-brand-warm-border py-5" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-2xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
        Details
        <span aria-hidden="true" className="text-xl text-brand-antique-gold transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <dl className="mt-4">
        <DetailRow label="Category" value={getRelationshipLabel(dress.category)} />
        <DetailRow label="Designer" value={getRelationshipLabel(dress.designer)} />
        <DetailRow label="Collection" value={dress.collectionName ?? null} />
        <DetailRow label="Silhouette" value={getRelationshipLabel(dress.silhouette)} />
        <DetailRow label="Fabrics" value={fabricLabels.join(', ') || null} />
        <DetailRow label="Colours" value={colorLabels.join(', ') || null} />
        <DetailRow label="Available sizes" value={sizeLabels.join(', ') || null} />
        <DetailRow label="Condition" value={getConditionLabel(dress.condition)} />
        <DetailRow label="SKU" value={dress.sku} />
      </dl>
    </details>
  )
}

function DescriptionSection({ dress }: { dress: Dress }) {
  if (!dress.description) {
    return null
  }

  return (
    <details className="group border-t border-brand-warm-border py-5" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-2xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
        Description
        <span aria-hidden="true" className="text-xl text-brand-antique-gold transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <RichText
        className="mt-4 text-sm leading-7 text-muted-foreground"
        data={dress.description}
        enableGutter={false}
      />
    </details>
  )
}

function RentalSection({ dress }: { dress: Dress }) {
  if (!dress.availableForRent) {
    return null
  }

  return (
    <details className="group border-t border-brand-warm-border py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-2xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
        Rental information
        <span aria-hidden="true" className="text-xl text-brand-antique-gold transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
        <p>
          {dress.rentalPrice != null
            ? `From ${formatCurrency(dress.rentalPrice)} rental.`
            : 'Rental pricing will be confirmed during booking.'}
        </p>
        <p>
          Security deposit:{' '}
          {dress.securityDeposit != null
            ? formatCurrency(dress.securityDeposit)
            : 'confirmed during booking'}
          . Standard rental period: {dress.rentalPeriodDays ?? 4} days.
        </p>
        <p>Final availability is confirmed during booking.</p>
      </div>
    </details>
  )
}

function CareSection() {
  return (
    <details className="group border-y border-brand-warm-border py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-2xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
        Care and fitting
        <span aria-hidden="true" className="text-xl text-brand-antique-gold transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
        <p>Fittings are private and shaped around your ceremony plans.</p>
        <p>The fitting booking fee is {formatFittingFee()}.</p>
        <p>
          Final alterations, cleaning, collection and return policies will be confirmed separately.
        </p>
      </div>
    </details>
  )
}

export function DressDetails({ dress }: { dress: Dress }) {
  return (
    <section aria-label="Dress information" className="mt-12">
      <DetailsSection dress={dress} />
      <DescriptionSection dress={dress} />
      <RentalSection dress={dress} />
      <CareSection />
    </section>
  )
}
