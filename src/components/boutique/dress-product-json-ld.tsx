import { JsonLd } from '@/components/seo/json-ld'
import type { DressWithMedia } from '@/lib/dress-media'
import { buildDressProductJsonLd } from '@/lib/dress-product-json-ld'

export function DressProductJsonLd({ dress }: { dress: DressWithMedia }) {
  const jsonLd = buildDressProductJsonLd(dress)

  return <JsonLd data={jsonLd} />
}
