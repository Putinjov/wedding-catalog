import { siteConfig } from '@/config/site'

export type WebsiteBookingInitialPaymentState = {
  paymentStatus: 'unpaid'
  status: 'confirmed' | 'pending_payment'
}

export function requiresFittingFeePayment(amount: number = siteConfig.fittingFee): boolean {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount * 100)) {
    throw new Error('The fitting fee must be a non-negative amount in whole cents.')
  }
  return amount > 0
}

export function isFittingFeeWaived(amount: number = siteConfig.fittingFee): boolean {
  return !requiresFittingFeePayment(amount)
}

export function getWebsiteBookingInitialPaymentState(
  amount: number = siteConfig.fittingFee,
): WebsiteBookingInitialPaymentState {
  return {
    paymentStatus: 'unpaid',
    status: requiresFittingFeePayment(amount) ? 'pending_payment' : 'confirmed',
  }
}

export function isWaivedPublicBookingCreate({
  fittingFee,
  paymentOrigin,
  paymentStatus,
  source,
  status,
}: {
  fittingFee: number | null | undefined
  paymentOrigin: string | null | undefined
  paymentStatus: string
  source: string | null | undefined
  status: string
}): boolean {
  return (
    paymentOrigin === 'public-booking' &&
    source === 'website' &&
    fittingFee === siteConfig.fittingFee &&
    isFittingFeeWaived(fittingFee) &&
    paymentStatus === 'unpaid' &&
    status === 'confirmed'
  )
}
