export type SitemapEntry = {
  lastmod?: string
  loc: string
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function createSitemapResponse(entries: SitemapEntry[]): Response {
  const urls = entries
    .map(({ lastmod, loc }) => {
      const modified = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''
      return `<url><loc>${escapeXml(loc)}</loc>${modified}</url>`
    })
    .join('')

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        'Content-Type': 'application/xml',
      },
    },
  )
}
