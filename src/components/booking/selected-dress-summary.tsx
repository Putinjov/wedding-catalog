import type { Ref } from 'react'

import type { SelectedDressSummary as SelectedDress } from './types'

export function SelectedDressSummary({
  dress,
  onRemove,
  removeButtonDescriptionID,
  removeButtonRef,
}: {
  dress: SelectedDress
  onRemove: () => void
  removeButtonDescriptionID?: string
  removeButtonRef?: Ref<HTMLButtonElement>
}) {
  return (
    <div className="mt-8 flex items-start justify-between gap-4 border border-brand-warm-border bg-background p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Selected dress</p>
        <p className="mt-2 font-serif text-2xl text-foreground">{dress.name}</p>
      </div>
      <button
        aria-describedby={removeButtonDescriptionID}
        className="shrink-0 text-sm text-brand-deep-lavender underline decoration-brand-antique-gold underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2"
        onClick={onRemove}
        ref={removeButtonRef}
        type="button"
      >
        Remove dress
      </button>
    </div>
  )
}
