import type { Metadata } from 'next'

import { Button } from '@/components/ui/button'
import { formatFittingFee, siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: `Book a fitting | ${siteConfig.name}`,
  description: 'Choose whether your private fitting is for buying or renting a wedding dress.',
}

export default function BookAFittingPage() {
  return (
    <main className="bg-background">
      <section className="container grid gap-12 py-16 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
            Private fitting
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl md:text-7xl">
            Find time for the dress.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Tell us whether you are looking to buy or rent, and we will prepare the right edit for
            your private appointment.
          </p>
          <div className="mt-8 border-l-2 border-brand-antique-gold pl-5">
            <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
              Booking fee
            </p>
            <p className="mt-2 font-serif text-4xl text-brand-deep-lavender">{formatFittingFee()}</p>
          </div>
        </div>

        <div className="border border-brand-warm-border bg-brand-blush/35 p-6 sm:p-8 md:p-10">
          <fieldset>
            <legend className="font-serif text-3xl text-foreground">What brings you in?</legend>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Choose a purpose for your fitting. You can change this when the booking flow opens.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="cursor-pointer">
                <input
                  className="peer sr-only"
                  defaultChecked
                  name="fitting-purpose"
                  type="radio"
                  value="buy"
                />
                <span className="flex min-h-32 flex-col justify-between border border-brand-warm-border bg-background p-5 outline-none transition-colors peer-checked:border-brand-deep-lavender peer-checked:bg-brand-soft-lavender/55 peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                  <span className="text-xs uppercase tracking-[0.22em] text-brand-deep-lavender">
                    Buy
                  </span>
                  <span className="mt-8 font-serif text-2xl text-foreground">Find the one to keep</span>
                </span>
              </label>
              <label className="cursor-pointer">
                <input
                  className="peer sr-only"
                  name="fitting-purpose"
                  type="radio"
                  value="rent"
                />
                <span className="flex min-h-32 flex-col justify-between border border-brand-warm-border bg-background p-5 outline-none transition-colors peer-checked:border-brand-deep-lavender peer-checked:bg-brand-soft-lavender/55 peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                  <span className="text-xs uppercase tracking-[0.22em] text-brand-deep-lavender">
                    Rent
                  </span>
                  <span className="mt-8 font-serif text-2xl text-foreground">Wear the dream for less</span>
                </span>
              </label>
            </div>
          </fieldset>

          <p className="mt-8 border-t border-brand-warm-border pt-6 text-sm leading-6 text-muted-foreground">
            Payment will be required to confirm the appointment. The refund or purchase and rental
            credit policy will be confirmed before the booking flow launches.
          </p>
          <Button className="mt-6 w-full rounded-sm" disabled size="lg" type="button">
            Booking flow coming soon
          </Button>
        </div>
      </section>
    </main>
  )
}
