export const siteConfig = {
  name: 'CAIT Bridal',
  tagline: 'Your affordable wedding boutique',
  fittingFee: 20,
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
