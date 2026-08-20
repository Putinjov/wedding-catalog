import type { DressWithMedia } from '@/lib/dress-media'
import { buildDressProductJsonLd } from '@/lib/dress-product-json-ld'

export function DressProductJsonLd({ dress }: { dress: DressWithMedia }) {
  const jsonLd = buildDressProductJsonLd(dress)

  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      type="application/ld+json"
    />
  )
}
