import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

import { redirects } from './redirects'
import { getServerSideOrigin, normalizePublicAssetOrigin } from './src/config/site-url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const remoteImageOrigins = Array.from(
  new Set(
    [getServerSideOrigin(), normalizePublicAssetOrigin(process.env.R2_PUBLIC_URL)].filter(
      (origin): origin is string => Boolean(origin),
    ),
  ),
)

const baselineSecurityHeaders = [
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
]

if (process.env.NODE_ENV === 'production') {
  baselineSecurityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  })
}

const privateBookingHeaders = [
  { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
]

const nextConfig: NextConfig = {
  // Temporarily required on Windows until Next.js fixes Turbopack Sass resolution.
  // See: https://github.com/vercel/next.js/issues/86431
  sassOptions: {
    loadPaths: ['./node_modules/@payloadcms/ui/dist/scss/'],
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
      {
        pathname: '/brand/**',
      },
      {
        pathname: '/media/**',
      },
    ],
    qualities: [65, 75, 85, 90],
    remotePatterns: remoteImageOrigins.map((origin) => {
      const url = new URL(origin)

      return {
        hostname: url.hostname,
        pathname: `${url.pathname.replace(/\/+$/, '') || ''}/**`,
        port: url.port,
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
      }
    }),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: baselineSecurityHeaders,
      },
      {
        source: '/book-a-fitting/pending/:path*',
        headers: privateBookingHeaders,
      },
      {
        source: '/book-a-fitting/payment/:path*',
        headers: privateBookingHeaders,
      },
    ]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  reactStrictMode: true,
  redirects,
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
