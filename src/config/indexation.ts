import type { Metadata } from 'next'

export const privatePageRobots: NonNullable<Metadata['robots']> = {
  follow: false,
  index: false,
  nocache: true,
}

const privateBookingHeaders = [
  { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
]

const privateBookingRouteSources = [
  '/book-a-fitting/calendar/:path*',
  '/book-a-fitting/pending/:path*',
  '/book-a-fitting/payment/:path*',
]

export function getPrivateBookingHeaderRules() {
  return privateBookingRouteSources.map((source) => ({
    headers: privateBookingHeaders,
    source,
  }))
}
