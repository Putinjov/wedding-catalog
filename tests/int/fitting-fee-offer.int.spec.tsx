import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FittingFeeOffer } from '@/components/booking/fitting-fee-offer'
import { siteConfig } from '@/config/site'
import {
  getWebsiteBookingInitialPaymentState,
  isFittingFeeWaived,
  isWaivedPublicBookingCreate,
  requiresFittingFeePayment,
} from '@/lib/booking/fittingFee'

afterEach(cleanup)

describe('standard fitting fee after the welcome offer', () => {
  it('shows the current standard fee without a welcome promotion or crossed-out price', () => {
    render(<FittingFeeOffer />)

    const standardPrice = screen.getByText('€20')
    expect(standardPrice).not.toBeNull()
    expect(screen.queryByText('Temporarily free')).toBeNull()
    expect(screen.queryByText('Welcome offer')).toBeNull()
    expect(standardPrice.closest('del')).toBeNull()
  })

  it('requires the standard fee while retaining explicit zero-fee follow-up support', () => {
    expect(siteConfig.standardFittingFee).toBe(20)
    expect(siteConfig.fittingFee).toBe(20)
    expect(siteConfig.fittingFeePromotion).toBeNull()
    expect(isFittingFeeWaived()).toBe(false)
    expect(requiresFittingFeePayment()).toBe(true)
    expect(getWebsiteBookingInitialPaymentState()).toEqual({
      paymentStatus: 'unpaid',
      status: 'pending_payment',
    })
    expect(
      isWaivedPublicBookingCreate({
        fittingFee: 0,
        paymentOrigin: 'public-booking',
        paymentStatus: 'unpaid',
        source: 'website',
        status: 'confirmed',
      }),
    ).toBe(true)
  })

  it('still presents a server-approved returning customer waiver', () => {
    render(<FittingFeeOffer amount={0} waiverName="Returning customer" />)
    expect(screen.getByText('Free')).not.toBeNull()
    expect(screen.getByText('Returning customer')).not.toBeNull()
    expect(screen.queryByText('Welcome offer')).toBeNull()
    expect(getWebsiteBookingInitialPaymentState(0)).toEqual({ status: 'confirmed', paymentStatus: 'unpaid' })
  })

  it('does not authorize a forged free confirmation outside the public-booking context', () => {
    expect(
      isWaivedPublicBookingCreate({
        fittingFee: 0,
        paymentOrigin: undefined,
        paymentStatus: 'unpaid',
        source: 'website',
        status: 'confirmed',
      }),
    ).toBe(false)
  })

  it('restores the pending-payment lifecycle when the standard fee is enabled again', () => {
    expect(requiresFittingFeePayment(siteConfig.standardFittingFee)).toBe(true)
    expect(isFittingFeeWaived(siteConfig.standardFittingFee)).toBe(false)
    expect(getWebsiteBookingInitialPaymentState(siteConfig.standardFittingFee)).toEqual({
      paymentStatus: 'unpaid',
      status: 'pending_payment',
    })
  })

  it('fails closed for an invalid negative fee instead of treating it as waived', () => {
    expect(() => requiresFittingFeePayment(-1)).toThrow(/non-negative amount/i)
    expect(() => isFittingFeeWaived(-1)).toThrow(/non-negative amount/i)
  })
})
