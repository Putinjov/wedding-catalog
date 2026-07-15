import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BookingSummary } from '@/components/booking/booking-summary'
import { Button } from '@/components/ui/button'
import { bookingConfig } from '@/config/booking'
import { formatCurrency, siteConfig } from '@/config/site'
import { formatDateForCustomer, formatTimeForCustomer, getDateKey } from '@/lib/booking/date'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
import { getFittingCheckoutSession } from '@/lib/stripe/getFittingCheckoutSession'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Args = {
  searchParams: Promise<{
    reference?: string | string[]
    session_id?: string | string[]
  }>
}

function getQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function getDressName(appointment: Awaited<ReturnType<typeof getAppointmentByReference>>): string | null {
  return appointment && typeof appointment.dress === 'object' && appointment.dress !== null
    ? appointment.dress.name
    : null
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: {
      follow: false,
      index: false,
      nocache: true,
    },
    title: `Fitting payment | ${siteConfig.name}`,
  }
}

export default async function FittingPaymentSuccessPage({ searchParams }: Args) {
  const params = await searchParams
  const reference = getQueryValue(params.reference)
  const sessionId = getQueryValue(params.session_id)
  const appointment = await getAppointmentByReference(decodeURIComponent(reference))
  if (!appointment) {
    notFound()
  }

  const session = sessionId
    ? await getFittingCheckoutSession(appointment, sessionId)
    : null
  const sessionBelongsToAppointment = session?.id === appointment.stripeCheckoutSessionId
  const isConfirmed =
    sessionBelongsToAppointment &&
    appointment.paymentStatus === 'paid' &&
    appointment.status === 'confirmed'
  const isProcessing =
    sessionBelongsToAppointment &&
    !isConfirmed &&
    (session?.payment_status === 'paid' ||
      (session?.status === 'complete' && appointment.paymentStatus === 'pending'))
  const dressName = getDressName(appointment)
  const dateKey = getDateKey(new Date(appointment.startAt))
  const amountPaid = appointment.amountPaid ?? (session?.amount_total ?? 0)

  return (
    <main className="bg-background">
      <section className="container max-w-3xl py-16 md:py-24">
        <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
          Private fitting
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl">
          {isConfirmed
            ? 'Your fitting is confirmed'
            : isProcessing
              ? 'Your payment is being processed'
              : 'We could not verify this payment'}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          {isConfirmed
            ? 'Your fitting fee has been verified and your appointment is confirmed.'
            : isProcessing
              ? 'Stripe has received your payment. We are waiting for the verified webhook before confirming the appointment. Please do not pay again.'
              : 'This page does not confirm an appointment by itself. Return to your pending booking to check the payment or retry securely.'}
        </p>

        <div className="mt-10 border border-brand-warm-border bg-brand-blush/30 p-6 sm:p-8">
          <BookingSummary
            date={formatDateForCustomer(dateKey)}
            dressName={dressName}
            duration={`${bookingConfig.durationMinutes} minutes`}
            fee={
              isConfirmed || isProcessing
                ? formatCurrency(amountPaid / 100, { maximumFractionDigits: 0 })
                : formatCurrency(appointment.fittingFee, { maximumFractionDigits: 0 })
            }
            purpose={appointment.purpose}
            time={formatTimeForCustomer(appointment.startAt)}
          />
          {isConfirmed ? (
            <div className="mt-6 border-t border-brand-warm-border pt-5">
              <p className="text-sm text-muted-foreground">Reference</p>
              <p className="mt-1 font-medium text-foreground">{appointment.publicReference}</p>
            </div>
          ) : null}
        </div>

        {!isConfirmed ? (
          <div className="mt-8">
            <Button asChild className="rounded-sm" size="lg" variant="outline">
              <Link href={`/book-a-fitting/pending/${encodeURIComponent(appointment.publicReference)}`}>
                Return to pending booking
              </Link>
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
