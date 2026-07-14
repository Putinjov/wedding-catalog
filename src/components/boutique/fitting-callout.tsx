import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { formatFittingFee } from '@/config/site'

export function FittingCallout() {
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
          <Button asChild className="w-fit rounded-sm px-6" size="lg">
            <Link href="/book-a-fitting">Book a fitting</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
