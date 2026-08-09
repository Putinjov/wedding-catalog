import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { HoldCountdown } from '@/components/booking/hold-countdown'
import { PaymentButton } from '@/components/booking/payment-button'
import { privatePageRobots } from '@/config/indexation'
import { formatCurrency } from '@/config/site'
import { formatDateTimeForCustomer } from '@/lib/booking/date'
import { isAppointmentHoldActive } from '@/lib/booking/appointmentHold'
import { getAppointmentByReference } from '@/lib/booking/getAppointment'
import { getBookingPurposeCustomerLabel } from '@/lib/booking/purpose'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Args = {
  params: Promise<{
    reference?: string
  }>
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { reference = '' } = await paramsPromise
  const appointment = await getAppointmentByReference(decodeURIComponent(reference))

  return {
    robots: privatePageRobots,
    title: appointment ? 'Appointment pending' : 'Appointment not found',
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
  const isConfirmed = appointment.status === 'confirmed'
  const now = new Date()
  const serverNow = now.toISOString()
  const holdExpiresAt = appointment.holdExpiresAt
  const holdActive = isAppointmentHoldActive(appointment, now)
  const hasPayableLifecycle =
    appointment.status === 'pending_payment' ||
    appointment.status === 'payment_processing' ||
    appointment.status === 'payment_failed'
  const isExpired = appointment.source === 'website' && hasPayableLifecycle && !holdActive
  const isProcessing = appointment.status === 'payment_processing' && !isExpired
  const isConflict = appointment.status === 'payment_received_conflict'
  const canPay =
    (appointment.status === 'pending_payment' || appointment.status === 'payment_failed') &&
    !isPaid &&
    holdActive
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
              ? 'Payment received; review required'
              : isExpired
                ? 'Your payment hold has expired'
              : isProcessing
                ? 'Your payment is being processed'
                : canPay
                  ? 'Appointment held pending payment'
                  : 'This appointment is no longer payable'}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          {isConfirmed
            ? isPaid
              ? 'Your fitting fee has been verified. We look forward to welcoming you.'
              : 'Our team has confirmed this manual appointment. Its payment state is tracked separately.'
            : isConflict || isPaid
              ? 'Your fitting fee has been verified. Our team will review the appointment details before confirming the slot.'
              : isExpired
                ? 'This fitting time is no longer reserved and cannot be paid through this link. Please choose an available time again.'
              : isProcessing
                ? 'Stripe is processing your fitting fee. Please do not pay again while verification is pending.'
                : canPay
                  ? 'We have recorded your requested appointment. It is not confirmed until the fitting fee has been paid.'
                  : 'This private booking cannot accept another online payment. Please contact our team if you need help.'}
        </p>

        <div className="mt-10 border border-brand-warm-border bg-brand-blush/30 p-6 sm:p-8">
          <dl className="divide-y divide-brand-warm-border">
            <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-sm text-muted-foreground">Purpose</dt>
              <dd className="font-medium text-foreground">
                {getBookingPurposeCustomerLabel(appointment.purpose)}
              </dd>
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
              <dd className="font-medium text-foreground">{durationMinutes} minutes</dd>
            </div>
            <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-sm text-muted-foreground">Fitting fee</dt>
              <dd className="font-serif text-2xl text-brand-deep-lavender">
                {formatCurrency(appointment.fittingFee, { maximumFractionDigits: 0 })}
              </dd>
            </div>
          </dl>
        </div>

        {!canPay ? (
          <div className="mt-8">
            {isProcessing && holdExpiresAt ? (
              <div className="mb-4">
                <HoldCountdown expiresAt={holdExpiresAt} serverNow={serverNow} />
              </div>
            ) : null}
            <p className="text-sm leading-6 text-muted-foreground">
              {isExpired
                ? 'The backend has released this slot at the displayed expiry boundary. Start a new booking to see current availability.'
                : isProcessing
                ? 'Payment verification is in progress. Refresh this private page later to see the latest status.'
                : isConfirmed || isConflict || isPaid
                  ? 'Online payment covers the private fitting fee only. Any dress purchase or rental is arranged in store.'
                  : 'No further online payment is available for this appointment.'}
            </p>
          </div>
        ) : holdExpiresAt ? (
          <div className="mt-8 flex flex-col items-start gap-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Pay the fitting fee securely through Stripe-hosted Checkout to confirm this
              appointment.
            </p>
            <PaymentButton
              amount={formatCurrency(appointment.fittingFee, { maximumFractionDigits: 0 })}
              expiresAt={holdExpiresAt}
              reference={appointment.publicReference}
              serverNow={serverNow}
            />
          </div>
        ) : null}
      </section>
    </main>
  )
}
