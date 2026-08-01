import RichText from '@/components/RichText'
import { formatFittingFee } from '@/config/site'
import {
  getConditionLabel,
  getRelationshipLabel,
  getRelationshipLabels,
} from '@/lib/dress-utils'
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
  const colorLabels = getRelationshipLabels(dress.colors)
  const fabricLabels = getRelationshipLabels(dress.fabrics)
  const embellishmentLabels = getRelationshipLabels(dress.embellishments)
  const includedAccessories = dress.includedAccessories?.map(({ item }) => item) ?? []
  const optionalAccessories = dress.optionalAccessories?.map(({ item }) => item) ?? []

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
        <DetailRow label="Neckline" value={getRelationshipLabel(dress.neckline)} />
        <DetailRow label="Sleeves" value={getRelationshipLabel(dress.sleeves)} />
        <DetailRow label="Train" value={getRelationshipLabel(dress.train)} />
        <DetailRow label="Back" value={getRelationshipLabel(dress.back)} />
        <DetailRow label="Waistline" value={getRelationshipLabel(dress.waistline)} />
        <DetailRow label="Embellishments" value={embellishmentLabels.join(', ') || null} />
        <DetailRow label="Fabrics" value={fabricLabels.join(', ') || null} />
        <DetailRow label="Colours" value={colorLabels.join(', ') || null} />
        <DetailRow label="Condition" value={getConditionLabel(dress.condition)} />
        <DetailRow label="Included accessories" value={includedAccessories.join(', ') || null} />
        <DetailRow label="Optional accessories" value={optionalAccessories.join(', ') || null} />
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

function CareSection({ dress }: { dress: Dress }) {
  return (
    <details className="group border-y border-brand-warm-border py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-2xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-4 [&::-webkit-details-marker]:hidden">
        Care and fitting
        <span aria-hidden="true" className="text-xl text-brand-antique-gold transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
        <p>Every dress is individually fitted and professionally altered for you by our boutique team.</p>
        {dress.fitNotes ? <p>{dress.fitNotes}</p> : null}
        {dress.alterationPossibilities ? (
          <p>Alteration possibilities: {dress.alterationPossibilities}</p>
        ) : null}
        {dress.alterationLimitations ? (
          <p>Alteration limitations: {dress.alterationLimitations}</p>
        ) : null}
        <p>Your private fitting gives us time to understand your ceremony plans and agree the appropriate alterations for this individual dress.</p>
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
      <CareSection dress={dress} />
    </section>
  )
}
