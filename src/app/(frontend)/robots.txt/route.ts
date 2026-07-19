import { getCanonicalOrigin, isVercelPreview } from '@/config/site-url'

export const dynamic = 'force-dynamic'

export function GET(): Response {
  const body = isVercelPreview()
    ? ['User-agent: *', 'Disallow: /']
    : [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        'Disallow: /api/',
        'Disallow: /book-a-fitting/payment/',
        'Disallow: /book-a-fitting/pending/',
        'Disallow: /next/',
        `Sitemap: ${getCanonicalOrigin()}/sitemap.xml`,
        `Host: ${getCanonicalOrigin()}`,
      ]

  return new Response(`${body.join('\n')}\n`, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
