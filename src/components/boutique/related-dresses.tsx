import type { DressMode } from '@/lib/catalogue'
import type { Dress } from '@/payload-types'

import { DressGrid } from './dress-grid'

export function RelatedDresses({ dresses, mode }: { dresses: Dress[]; mode: DressMode }) {
  if (dresses.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="related-dresses-title" className="container py-16 md:py-24">
      <div className="mb-8 flex items-end justify-between gap-6 border-t border-brand-warm-border pt-8">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-brand-deep-lavender">The edit</p>
          <h2 className="mt-2 font-serif text-4xl text-foreground" id="related-dresses-title">
            You may also like
          </h2>
        </div>
      </div>
      <DressGrid dresses={dresses} mode={mode} />
    </section>
  )
}
