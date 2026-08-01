import type { DressDisplayMode } from '@/lib/catalogue'
import type { DressWithMedia } from '@/lib/dress-media'

import { DressCard } from './dress-card'

export function DressGrid({
  dresses,
  mode = 'all',
  returnTo,
  source,
}: {
  dresses: DressWithMedia[]
  mode?: DressDisplayMode
  returnTo?: string | null
  source?: 'related' | null
}) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {dresses.map((dress) => (
        <DressCard
          dress={dress}
          key={dress.id}
          mode={mode}
          returnTo={returnTo}
          source={source}
        />
      ))}
    </div>
  )
}
