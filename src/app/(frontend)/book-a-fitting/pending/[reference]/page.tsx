import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PaymentButton } from '@/components/booking/payment-button'
import { bookingConfig } from '@/config/booking'
import { formatCurrency, siteConfig } from '@/config/site'
import { formatDateTimeForCustomer } from '@/lib/booking/date'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'

type Args = {
  params: Promise<{
    reference?: string
  }>
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { reference = '' } = await paramsPromise
  const appointment = await getAppointmentByReference(decodeURIComponent(reference))

  return {
    title: appointment
      ? `Appointment pending | ${siteConfig.name}`
      : `Appointment not found | ${siteConfig.name}`,
  }
}

export default async function PendingAppointmentPage({ params: paramsPromise }: Args) {
  const { reference = '' } = await paramsPromise
  const appointment = await getAppointmentByReference(decodeURIComponent(reference))

  if (!appointment) {
    notFound()
  }

  const dressName =
    typeof appointment.dress === 'object' && appointment.dress !== null
      ? appointment.dress.name
      : null
  const isPaid = appointment.paymentStatus === 'paid'
  const isConfirmed = isPaid && appointment.status === 'confirmed'

  return (
    <main className="bg-background">
      <section className="container max-w-3xl py-16 md:py-24">
        <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
          Private fitting
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl">
          {isConfirmed ? 'Your fitting is confirmed' : isPaid ? 'Payment received' : 'Appointment held pending payment'}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          {isConfirmed
            ? 'Your fitting fee has been verified. We look forward to welcoming you.'
            : isPaid
              ? 'Your fitting fee has been verified. Our team will review the appointment details before confirming the slot.'
            : 'We have recorded your requested appointment. It is not confirmed until the fitting fee has been paid.'}
        </p>

        <div className="mt-10 border border-brand-warm-border bg-brand-blush/30 p-6 sm:p-8">
          <dl className="divide-y divide-brand-warm-border">
            <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-sm text-muted-foreground">Purpose</dt>
              <dd className="font-medium capitalize text-foreground">{appointment.purpose}</dd>
            </div>
            {dressName ? (
              <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="text-sm text-muted-foreground">Dress</dt>
                <dd className="font-medium text-foreground">{dressName}</dd>
              </div>
            ) : null}
            <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-sm text-muted-foreground">Appointment</dt>
              <dd className="font-medium text-foreground">
                {formatDateTimeForCustomer(appointment.startAt)}
              </dd>
            </div>
            <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-sm text-muted-foreground">Duration</dt>
              <dd className="font-medium text-foreground">{bookingConfig.durationMinutes} minutes</dd>
            </div>
            <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-sm text-muted-foreground">Fitting fee</dt>
              <dd className="font-serif text-2xl text-brand-deep-lavender">
                {formatCurrency(appointment.fittingFee, { maximumFractionDigits: 0 })}
              </dd>
            </div>
          </dl>
        </div>

        {isPaid ? (
          <div className="mt-8">
            <p className="text-sm leading-6 text-muted-foreground">
              Online payment covers the private fitting fee only. Dress purchase and rental are
              completed in store.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-start gap-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Pay the fitting fee securely through Stripe-hosted Checkout to confirm this
              appointment.
            </p>
            <PaymentButton
              amount={formatCurrency(appointment.fittingFee, { maximumFractionDigits: 0 })}
              reference={appointment.publicReference}
            />
          </div>
        )}
      </section>
    </main>
  )
}
