import { BookingDialog } from '@/components/booking/booking-dialog'
import { buttonVariants } from '@/components/ui/button'
import { formatFittingFee } from '@/config/site'
import { getBookingDateBounds } from '@/lib/booking/date'

export function FittingCallout() {
  const bounds = getBookingDateBounds()

  return (
    <section className="bg-secondary/65 py-16 md:py-24">
      <div className="container">
        <div className="grid gap-8 border-y border-border py-12 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">Private appointments</p>
            <h2 className="mt-3 font-serif text-4xl text-foreground md:text-5xl">
              Book your private fitting
            </h2>
            <p className="mt-4 font-serif text-3xl text-brand-deep-lavender">{formatFittingFee()}</p>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              A private appointment to explore shape, fabric and whether buying or renting is right
              for you. The booking fee is required to confirm your appointment; refund and purchase
              or rental credit details will be shared with the booking policy.
            </p>
          </div>
          <BookingDialog
            dialogID="generic-fitting"
            fallbackHref="/book-a-fitting"
            initialPurpose="buy"
            maxDate={bounds.maxDate}
            minDate={bounds.minDate}
            primaryClassName={buttonVariants({ className: 'w-fit rounded-sm px-6', size: 'lg' })}
            primaryLabel="Book a fitting"
            selectedDress={null}
          />
        </div>
      </div>
    </section>
  )
}
