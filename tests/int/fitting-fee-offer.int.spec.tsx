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

describe('welcome fitting-fee offer', () => {
  it('keeps the standard price visible while presenting the current fee as temporarily free', () => {
    render(<FittingFeeOffer />)

    const standardPrice = screen.getByText('€20', { selector: 'del' })
    expect(standardPrice).not.toBeNull()
    expect(screen.getByText('Temporarily free')).not.toBeNull()
    expect(screen.getByText('Welcome offer')).not.toBeNull()
    expect(screen.getByText(/standard fitting fee €20.*temporarily free.*welcome offer/i)).not.toBeNull()
  })

  it('makes zero the authoritative current fee and starts website bookings confirmed and unpaid', () => {
    expect(siteConfig.standardFittingFee).toBe(20)
    expect(siteConfig.fittingFee).toBe(0)
    expect(isFittingFeeWaived()).toBe(true)
    expect(requiresFittingFeePayment()).toBe(false)
    expect(getWebsiteBookingInitialPaymentState()).toEqual({
      paymentStatus: 'unpaid',
      status: 'confirmed',
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
