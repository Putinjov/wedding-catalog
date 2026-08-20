import { JsonLd } from '@/components/seo/json-ld'
import type { ResolvedBookingSettings } from '@/config/booking'
import { buildLocalBusinessJsonLd } from '@/lib/local-business-json-ld'

export function LocalBusinessJsonLd({
  origin,
  settings,
}: {
  origin?: string
  settings: ResolvedBookingSettings
}) {
  return <JsonLd data={buildLocalBusinessJsonLd(settings, origin)} />
}
