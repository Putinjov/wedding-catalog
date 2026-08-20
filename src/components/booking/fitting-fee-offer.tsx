import {
  formatCurrency,
  formatStandardFittingFee,
  siteConfig,
} from '@/config/site'
import { isFittingFeeWaived } from '@/lib/booking/fittingFee'
import { cn } from '@/utilities/ui'

export function FittingFeeOffer({
  amount = siteConfig.fittingFee,
  className,
  size = 'large',
}: {
  amount?: number
  className?: string
  size?: 'compact' | 'large' | 'medium'
}) {
  if (!isFittingFeeWaived(amount)) {
    return (
      <span
        className={cn(
          size === 'compact' ? 'font-medium' : 'font-serif text-brand-deep-lavender',
          size === 'large' && 'text-4xl',
          size === 'medium' && 'text-2xl',
          className,
        )}
      >
        {formatCurrency(amount, { maximumFractionDigits: 0 })}
      </span>
    )
  }

  const promotion = siteConfig.fittingFeePromotion
  const promotionLabel = promotion?.label ?? 'Free'
  const promotionName = promotion?.name ?? 'Fitting fee waived'

  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-baseline gap-x-3 gap-y-1',
        size === 'large' && 'flex-col items-start gap-x-4 sm:flex-row sm:items-baseline',
        className,
      )}
    >
      <span className="sr-only">
        Standard fitting fee {formatStandardFittingFee()}. {promotionLabel}, {promotionName}.
      </span>
      <del
        aria-hidden="true"
        className={cn(
          'text-muted-foreground decoration-2',
          size === 'large' ? 'text-xl' : 'text-sm',
        )}
      >
        {formatStandardFittingFee()}
      </del>
      <strong
        aria-hidden="true"
        className={cn(
          'font-serif font-normal text-brand-deep-lavender',
          size === 'compact' ? 'text-lg' : size === 'medium' ? 'text-2xl' : 'text-4xl',
        )}
      >
        {promotionLabel}
      </strong>
      <span
        aria-hidden="true"
        className="text-xs font-medium uppercase tracking-[0.18em] text-foreground"
      >
        {promotionName}
      </span>
    </span>
  )
}
