import { getCanonicalOrigin } from '@/config/site-url'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const origin = getCanonicalOrigin()
  const sitemapLocations = [`${origin}/pages-sitemap.xml`, `${origin}/posts-sitemap.xml`]
  const entries = sitemapLocations.map((location) => `  <sitemap><loc>${location}</loc></sitemap>`)
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</sitemapindex>',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'Content-Type': 'application/xml',
    },
  })
}
