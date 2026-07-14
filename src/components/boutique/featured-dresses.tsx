import Link from 'next/link'

import { Button } from '@/components/ui/button'
import type { Dress } from '@/payload-types'

import { DressGrid } from './dress-grid'

export function FeaturedDresses({ dresses }: { dresses: Dress[] }) {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Featured dresses</p>
            <h2 className="mt-3 font-serif text-4xl text-foreground md:text-5xl">
              Chosen for the moment
            </h2>
          </div>
          <Button asChild className="w-fit rounded-sm" variant="outline">
            <Link href="/dresses">Explore buy &amp; rent</Link>
          </Button>
        </div>

        {dresses.length > 0 ? (
          <DressGrid dresses={dresses} />
        ) : (
          <div className="border border-border bg-secondary/45 px-6 py-10 text-muted-foreground">
            Featured dresses will appear here once they are published.
          </div>
        )}
      </div>
    </section>
  )
}
