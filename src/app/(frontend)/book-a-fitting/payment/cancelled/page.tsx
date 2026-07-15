import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BookingSummary } from '@/components/booking/booking-summary'
import { Button } from '@/components/ui/button'
import { bookingConfig } from '@/config/booking'
import { formatCurrency, siteConfig } from '@/config/site'
import { formatDateForCustomer, formatTimeForCustomer, getDateKey } from '@/lib/booking/date'
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
  robots: {
    follow: false,
    index: false,
    nocache: true,
  },
  title: `Payment cancelled | ${siteConfig.name}`,
}

export default async function FittingPaymentCancelledPage({ searchParams }: Args) {
  const params = await searchParams
  const reference = getQueryValue(params.reference)
  const appointment = await getAppointmentByReference(decodeURIComponent(reference))
  if (!appointment) {
    notFound()
  }

  const isConfirmed = appointment.paymentStatus === 'paid' && appointment.status === 'confirmed'
  const dressName =
    typeof appointment.dress === 'object' && appointment.dress !== null
      ? appointment.dress.name
      : null
  const dateKey = getDateKey(new Date(appointment.startAt))

  return (
    <main className="bg-background">
      <section className="container max-w-3xl py-16 md:py-24">
        <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
          Private fitting
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl">
          {isConfirmed ? 'Your fitting is confirmed' : 'Payment was not completed'}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          {isConfirmed
            ? 'This cancellation link is out of date because the fitting fee has since been verified.'
            : 'Your appointment is still held pending payment and is not confirmed. You can return to the pending booking to try again.'}
        </p>

        <div className="mt-10 border border-brand-warm-border bg-brand-blush/30 p-6 sm:p-8">
          <BookingSummary
            date={formatDateForCustomer(dateKey)}
            dressName={dressName}
            duration={`${bookingConfig.durationMinutes} minutes`}
            fee={formatCurrency(appointment.fittingFee, { maximumFractionDigits: 0 })}
            purpose={appointment.purpose}
            time={formatTimeForCustomer(appointment.startAt)}
          />
        </div>

        {!isConfirmed ? (
          <div className="mt-8">
            <Button asChild className="rounded-sm" size="lg">
              <Link href={`/book-a-fitting/pending/${encodeURIComponent(appointment.publicReference)}`}>
                Return to payment
              </Link>
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
