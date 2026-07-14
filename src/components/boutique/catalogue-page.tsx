import type { CatalogueMode } from '@/lib/catalogue'
import { catalogueContent } from '@/lib/catalogue'
import { getDresses } from '@/lib/getDresses'

import { DressGrid } from './dress-grid'

export async function CataloguePage({ mode }: { mode: CatalogueMode }) {
  const dresses = await getDresses(mode)
  const content = catalogueContent[mode]

  return (
    <main className="bg-background">
      <section className="container py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl md:text-7xl">
            {content.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            {content.description}
          </p>
        </div>

        <div className="mt-14">
          {dresses.length > 0 ? (
            <DressGrid dresses={dresses} mode={mode} />
          ) : (
            <div className="border border-border bg-secondary/45 px-6 py-10 text-muted-foreground">
              This collection will appear here once dresses have been published and made available.
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
