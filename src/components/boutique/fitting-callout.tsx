import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function FittingCallout() {
  return (
    <section className="bg-secondary/65 py-16 md:py-24">
      <div className="container">
        <div className="grid gap-8 border-y border-border py-12 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Private appointments</p>
            <h2 className="mt-3 font-serif text-4xl text-foreground md:text-5xl">
              Book a private fitting
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Visit the boutique for a calm, considered appointment with time to explore shape,
              fabric and rental or purchase options.
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
