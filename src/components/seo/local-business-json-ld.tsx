import { JsonLd } from '@/components/seo/json-ld'
import { buildLocalBusinessJsonLd } from '@/lib/local-business-json-ld'

export function LocalBusinessJsonLd({ origin }: { origin?: string }) {
  return <JsonLd data={buildLocalBusinessJsonLd(origin)} />
}
