import { Facebook, Instagram } from 'lucide-react'

import type { publicBusinessSocialProfiles } from '@/config/business'

type SocialPlatform = (typeof publicBusinessSocialProfiles)[number]['label']

export function SocialIcon({ platform }: { platform: SocialPlatform }) {
  const props = { 'aria-hidden': true as const, className: 'size-5', focusable: false }
  if (platform === 'Instagram') return <Instagram {...props} />
  if (platform === 'Facebook') return <Facebook {...props} />

  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.7 2h-3.4v13.7a3.1 3.1 0 1 1-2.7-3.1V9.1a6.6 6.6 0 1 0 6.1 6.6V8.8a8.3 8.3 0 0 0 4.8 1.5V6.9A4.8 4.8 0 0 1 16.7 2Z" />
    </svg>
  )
}
