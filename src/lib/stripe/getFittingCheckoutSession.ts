import type Stripe from 'stripe'

import type { Appointment } from '@/payload-types'

import { getStripeClient } from './client'
import { isMatchingFittingCheckoutSession } from './fitting'

const checkoutSessionPattern = /^cs_[A-Za-z0-9_]+$/

export async function getFittingCheckoutSession(
  appointment: Pick<Appointment, 'currency' | 'fittingFee' | 'id' | 'publicReference'>,
  sessionId: string,
): Promise<Stripe.Checkout.Session | null> {
  if (!checkoutSessionPattern.test(sessionId)) {
    return null
  }

  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId)
    return isMatchingFittingCheckoutSession(session, appointment) ? session : null
  } catch {
    return null
  }
}
