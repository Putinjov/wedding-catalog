'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

import type { DressMode } from '@/lib/catalogue'

export function DressModeSelector({
  initialMode,
  modes,
}: {
  initialMode: DressMode
  modes: DressMode[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState(initialMode)

  if (modes.length < 2) {
    return null
  }

  function handleModeChange(mode: DressMode) {
    setSelectedMode(mode)
    router.push(`${pathname}?mode=${mode}`, { scroll: false })
  }

  return (
    <div aria-label="Choose how to wear this dress" className="mt-8" role="group">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Your dress journey
      </p>
      <div className="mt-3 inline-flex border border-brand-warm-border bg-background p-1">
        {modes.map((mode) => (
          <button
            aria-pressed={selectedMode === mode}
            className="min-w-24 px-4 py-2 text-sm font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2 data-[selected=true]:bg-brand-deep-lavender data-[selected=true]:text-white"
            data-selected={selectedMode === mode}
            key={mode}
            onClick={() => handleModeChange(mode)}
            type="button"
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
