import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BookingSummary } from '@/components/booking/booking-summary'
import { HoldCountdown } from '@/components/booking/hold-countdown'
import { Button } from '@/components/ui/button'
import { privatePageRobots } from '@/config/indexation'
import { formatCurrency } from '@/config/site'
import { formatDateForCustomer, formatTimeForCustomer, getDateKey } from '@/lib/booking/date'
import { isAppointmentHoldActive } from '@/lib/booking/appointmentHold'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Args = {
  searchParams: Promise<{
    reference?: string | string[]
  }>
}

function getQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export const metadata: Metadata = {
  robots: privatePageRobots,
  title: 'Payment cancelled',
}

export default async function FittingPaymentCancelledPage({ searchParams }: Args) {
  const params = await searchParams
  const reference = getQueryValue(params.reference)
  const appointment = await getAppointmentByReference(decodeURIComponent(reference))
  if (!appointment) {
    notFound()
  }

  const now = new Date()
  const serverNow = now.toISOString()
  const holdExpiresAt = appointment.holdExpiresAt
  const holdActive = isAppointmentHoldActive(appointment, now)
  const hasPayableLifecycle =
    appointment.status === 'pending_payment' ||
    appointment.status === 'payment_processing' ||
    appointment.status === 'payment_failed'
  const isExpired = appointment.source === 'website' && hasPayableLifecycle && !holdActive
  const isConfirmed = appointment.paymentStatus === 'paid' && appointment.status === 'confirmed'
  const isConflict =
    appointment.paymentStatus === 'paid' && appointment.status === 'payment_received_conflict'
  const isProcessing = appointment.status === 'payment_processing' && !isExpired
  const dressName =
    typeof appointment.dress === 'object' && appointment.dress !== null
      ? appointment.dress.name
      : null
  const dateKey = getDateKey(new Date(appointment.startAt))
  const durationMinutes = Math.round(
    (new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / 60_000,
  )

  return (
    <main className="bg-background">
      <section className="container max-w-3xl py-16 md:py-24">
        <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
          Private fitting
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl">
          {isConfirmed
            ? 'Your fitting is confirmed'
            : isConflict
              ? 'Your payment needs review'
              : isExpired
                ? 'Your payment hold has expired'
              : isProcessing
                ? 'Your payment is being processed'
                : 'Payment was not completed'}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          {isConfirmed
            ? 'This cancellation link is out of date because the fitting fee has since been verified.'
            : isConflict
              ? 'The fitting fee was received, but the appointment could not be confirmed automatically. Please do not pay again.'
              : isExpired
                ? 'This fitting time is no longer reserved. Return to the booking flow to choose from current availability.'
              : isProcessing
                ? 'Stripe is still processing the fitting fee. Please do not pay again while verification is pending.'
                : 'Your appointment is still held pending payment and is not confirmed. You can return to the pending booking to try again.'}
        </p>

        <div className="mt-10 border border-brand-warm-border bg-brand-blush/30 p-6 sm:p-8">
          <BookingSummary
            date={formatDateForCustomer(dateKey)}
            dressName={dressName}
            duration={`${durationMinutes} minutes`}
            fee={formatCurrency(appointment.fittingFee, { maximumFractionDigits: 0 })}
            purpose={appointment.purpose}
            time={formatTimeForCustomer(appointment.startAt)}
          />
        </div>

        {holdActive && holdExpiresAt && !isConfirmed && !isConflict ? (
          <div className="mt-6">
            <HoldCountdown expiresAt={holdExpiresAt} serverNow={serverNow} />
          </div>
        ) : null}

        {!isConfirmed ? (
          <div className="mt-8">
            <Button asChild className="rounded-sm" size="lg">
              <Link href={`/book-a-fitting/pending/${encodeURIComponent(appointment.publicReference)}`}>
                {isExpired ? 'Return to booking details' : 'Return to payment'}
              </Link>
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
