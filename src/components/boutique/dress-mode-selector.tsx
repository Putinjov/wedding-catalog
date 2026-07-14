import Link from 'next/link'

import type { DressMode } from '@/lib/catalogue'

export function DressModeSelector({
  initialMode,
  modes,
}: {
  initialMode: DressMode
  modes: DressMode[]
}) {
  if (modes.length < 2) {
    return null
  }

  return (
    <div aria-label="Choose how to wear this dress" className="mt-8" role="group">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Your dress journey
      </p>
      <div className="mt-3 inline-flex border border-brand-warm-border bg-background p-1">
        {modes.map((mode) => {
          const selected = initialMode === mode

          return (
            <Link
              aria-current={selected ? 'page' : undefined}
              className="min-w-24 px-4 py-2 text-center text-sm font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2 data-[selected=true]:bg-brand-deep-lavender data-[selected=true]:text-white"
              data-selected={selected}
              href={`?mode=${mode}`}
              key={mode}
              scroll={false}
            >
              {mode}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
