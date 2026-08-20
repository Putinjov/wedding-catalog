// Set to false to restore the standard fee and Stripe-backed confirmation flow.
const welcomeOfferActive: boolean = true
const standardFittingFee = 20

export const siteConfig = {
  name: 'CAIT Bridal',
  tagline: 'Your affordable wedding boutique',
  fittingFee: welcomeOfferActive ? 0 : standardFittingFee,
  fittingFeePromotion: welcomeOfferActive
    ? {
        label: 'Temporarily free',
        name: 'Welcome offer',
      }
    : null,
  standardFittingFee,
  currency: 'EUR',
} as const

export function formatCurrency(amount: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat('en-IE', {
    currency: siteConfig.currency,
    style: 'currency',
    ...options,
  }).format(amount)
}

export function formatFittingFee() {
  return formatCurrency(siteConfig.fittingFee, {
    maximumFractionDigits: 0,
  })
}

export function formatStandardFittingFee() {
  return formatCurrency(siteConfig.standardFittingFee, {
    maximumFractionDigits: 0,
  })
}

export function formatSiteTitle(title: string) {
  const normalizedTitle = title.trim()

  return normalizedTitle.toLocaleLowerCase().includes(siteConfig.name.toLocaleLowerCase())
    ? normalizedTitle
    : `${normalizedTitle} | ${siteConfig.name}`
}
