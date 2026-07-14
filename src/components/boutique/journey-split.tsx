import Link from 'next/link'

import { Button } from '@/components/ui/button'

const journeys = [
  {
    eyebrow: 'Buy',
    title: 'Find the one to keep',
    copy: 'Explore new and selected wedding dresses available to purchase.',
    href: '/buy',
    cta: 'Shop dresses',
    className: 'bg-brand-soft-lavender',
  },
  {
    eyebrow: 'Rent',
    title: 'Wear the dream for less',
    copy: 'Choose a beautiful gown for your day without the full purchase price.',
    href: '/rent',
    cta: 'Browse rentals',
    className: 'bg-brand-blush',
  },
] as const

interface JourneySplitProps {
  description?: string
  title?: string
}

export function JourneySplit({
  description = 'Choose the way you want to wear your dress.',
  title = 'Your dress, your way',
}: JourneySplitProps) {
  return (
    <section className="border-y border-border bg-background py-16 md:py-24">
      <div className="container">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">Buy or rent</p>
          <h2 className="mt-3 font-serif text-4xl text-foreground md:text-5xl">{title}</h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">{description}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {journeys.map(({ className, copy, cta, eyebrow, href, title: journeyTitle }) => (
            <article
              className={`${className} flex min-h-[22rem] flex-col justify-between border border-brand-warm-border p-8 sm:p-10 md:min-h-[26rem] md:p-12`}
              key={href}
            >
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
                  {eyebrow}
                </p>
                <h3 className="mt-5 max-w-md font-serif text-4xl leading-none text-foreground md:text-5xl">
                  {journeyTitle}
                </h3>
                <p className="mt-6 max-w-md text-base leading-7 text-foreground/75">{copy}</p>
              </div>
              <Button asChild className="mt-10 w-fit rounded-sm px-6">
                <Link href={href}>{cta}</Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
