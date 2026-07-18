import type { DressDisplayMode } from '@/lib/catalogue'
import type { DressWithMedia } from '@/lib/dress-media'

import { DressCard } from './dress-card'

export function DressGrid({
  dresses,
  mode = 'all',
}: {
  dresses: DressWithMedia[]
  mode?: DressDisplayMode
}) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {dresses.map((dress) => (
        <DressCard dress={dress} key={dress.id} mode={mode} />
      ))}
    </div>
  )
}
