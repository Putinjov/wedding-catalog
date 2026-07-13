import Link from 'next/link'

import { Media } from '@/components/Media'
import { Button } from '@/components/ui/button'
import type { Media as MediaType } from '@/payload-types'

interface HeroSectionProps {
  image?: MediaType | null
}

export function HeroSection({ image }: HeroSectionProps) {
  return (
    <section className="bg-background">
      <div className="container grid gap-10 py-14 md:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">THE BRIDAL EDIT</p>
          <h1 className="mt-5 font-serif text-5xl leading-[0.95] tracking-normal text-foreground sm:text-6xl lg:text-7xl">
            Find your dream dress
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
            Luxury wedding dresses available to buy or rent, selected for modern brides.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="rounded-sm px-6" size="lg">
              <Link href="/dresses">Browse collection</Link>
            </Button>
            <Button asChild className="rounded-sm px-6" size="lg" variant="outline">
              <Link href="/book-a-fitting">Book a fitting</Link>
            </Button>
          </div>
        </div>

        <div className="relative min-h-[26rem] overflow-hidden bg-secondary md:min-h-[34rem]">
          {image ? (
            <Media
              className="relative block h-full min-h-[26rem] md:min-h-[34rem]"
              fill
              imgClassName="object-cover"
              pictureClassName="relative block h-full w-full"
              priority
              resource={image}
              size="(max-width: 1024px) 100vw, 52vw"
            />
          ) : (
            <div className="flex h-full min-h-[26rem] items-center justify-center px-8 text-center md:min-h-[34rem]">
              <p className="max-w-xs font-serif text-3xl leading-tight text-muted-foreground">
                A quiet edit of gowns for modern ceremonies.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
