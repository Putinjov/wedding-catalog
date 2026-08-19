import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BookingSummary } from '@/components/booking/booking-summary'
import { PaymentStatusPoller } from '@/components/booking/payment-status-poller'
import { Button } from '@/components/ui/button'
import { emailDeliveryDefaults } from '@/config/email-addresses'
import { privatePageRobots } from '@/config/indexation'
import { formatCurrency } from '@/config/site'
import {
  getBookingSuccessState,
  type BookingSuccessState,
} from '@/lib/booking/bookingSuccess'
import { formatDateForCustomer, formatTimeForCustomer, getDateKey } from '@/lib/booking/date'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
import { getBookingSettings } from '@/lib/booking/settings'
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

const stateContent: Record<BookingSuccessState, { description: string; title: string }> = {
  confirmed: {
    description: 'Your fitting fee has been verified and your appointment is confirmed.',
    title: 'Your fitting is confirmed',
  },
  conflict: {
    description:
      'Your fitting fee has been verified, but the appointment could not be confirmed automatically. Our team will review it before confirming a slot.',
    title: 'Your payment needs review',
  },
  expired: {
    description:
      'This fitting time is no longer reserved. Choose from current availability to make a new booking.',
    title: 'Your payment hold has expired',
  },
  failed: {
    description:
      'This page could not verify a completed fitting payment. Review the private booking before trying again.',
    title: 'We could not verify this payment',
  },
  processing: {
    description:
      'Stripe has received your payment. We are waiting for the verified webhook before confirming the appointment. Please do not pay again.',
    title: 'Your payment is being processed',
  },
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: privatePageRobots,
    title: 'Fitting payment',
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
  const state = getBookingSuccessState({
    appointment,
    checkout: {
      belongsToAppointment: sessionBelongsToAppointment,
      paymentStatus: session?.payment_status,
      status: session?.status,
    },
  })
  const settings = await getBookingSettings()
  const { visitDetails } = settings
  const isConfirmed = state === 'confirmed'
  const isConflict = state === 'conflict'
  const isProcessing = state === 'processing'
  const dressName = getDressName(appointment)
  const dateKey = getDateKey(new Date(appointment.startAt))
  const amountPaid = appointment.amountPaid ?? (session?.amount_total ?? 0)
  const durationMinutes = Math.round(
    (new Date(appointment.endAt).getTime() - new Date(appointment.startAt).getTime()) / 60_000,
  )
  const content = stateContent[state]
  const pendingHref = `/book-a-fitting/pending/${encodeURIComponent(appointment.publicReference)}`
  const calendarHref = `/book-a-fitting/calendar/${encodeURIComponent(appointment.publicReference)}`
  const contactHref = `mailto:${emailDeliveryDefaults.replyToAddress}?subject=Fitting%20booking%20help`

  return (
    <main className="bg-background">
      <section className="container max-w-3xl py-16 md:py-24">
        <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
          Private fitting
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl">
          {content.title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          {content.description}
        </p>

        <div className="mt-10 border border-brand-warm-border bg-brand-blush/30 p-6 sm:p-8">
          <BookingSummary
            date={formatDateForCustomer(dateKey)}
            dressName={dressName}
            duration={`${durationMinutes} minutes`}
            fee={
              isConfirmed || isConflict || isProcessing
                ? formatCurrency(amountPaid / 100, { maximumFractionDigits: 0 })
                : formatCurrency(appointment.fittingFee, { maximumFractionDigits: 0 })
            }
            purpose={appointment.purpose}
            time={formatTimeForCustomer(appointment.startAt)}
          />
          <div className="mt-6 border-t border-brand-warm-border pt-5">
            <p className="text-sm text-muted-foreground">Reference</p>
            <p className="mt-1 break-all font-medium text-foreground">
              {appointment.publicReference}
            </p>
          </div>
        </div>

        {isProcessing ? (
          <div className="mt-8 border border-brand-warm-border p-5">
            <PaymentStatusPoller />
          </div>
        ) : null}

        {isConfirmed ? (
          <section aria-labelledby="visit-heading" className="mt-12 border-t border-brand-warm-border pt-10">
            <h2 id="visit-heading" className="font-serif text-3xl text-foreground">
              Plan your visit
            </h2>

            {visitDetails.address ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Address
                </h3>
                <p className="mt-2 whitespace-pre-line leading-7 text-foreground">
                  {visitDetails.address}
                </p>
                {visitDetails.mapUrl ? (
                  <a
                    className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={visitDetails.mapUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open directions
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : null}
              </div>
            ) : null}

            {visitDetails.arrivalInstructions ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Arrival
                </h3>
                <p className="mt-2 whitespace-pre-line leading-7 text-foreground">
                  {visitDetails.arrivalInstructions}
                </p>
              </div>
            ) : null}

            {visitDetails.whatToBring.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  What to bring
                </h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 leading-7 text-foreground">
                  {visitDetails.whatToBring.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="mt-8 text-sm leading-6 text-muted-foreground">
              A confirmation email is sent separately to the address supplied with the booking. If
              it does not arrive, check your spam folder or contact{' '}
              <a className="underline underline-offset-4" href={contactHref}>
                {emailDeliveryDefaults.replyToAddress}
              </a>
              .
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="min-h-11 rounded-sm" size="lg">
                <a href={calendarHref}>Add to calendar</a>
              </Button>
              <Button asChild className="min-h-11 rounded-sm" size="lg" variant="outline">
                <a href={contactHref}>Contact the boutique</a>
              </Button>
            </div>
          </section>
        ) : (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="min-h-11 rounded-sm" size="lg" variant="outline">
              <Link href={state === 'expired' ? '/book-a-fitting' : pendingHref}>
                {state === 'expired' ? 'Choose another fitting time' : 'Review private booking'}
              </Link>
            </Button>
            {isConflict ? (
              <Button asChild className="min-h-11 rounded-sm" size="lg" variant="outline">
                <a href={contactHref}>Contact the boutique</a>
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}
