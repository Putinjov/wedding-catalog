export const productionSiteOrigin = 'https://caitbridal.ie'

type PublicUrlEnvironment = Pick<
  NodeJS.ProcessEnv,
  | 'NEXT_PUBLIC_SERVER_URL'
  | 'NODE_ENV'
  | 'VERCEL_ENV'
  | 'VERCEL_PROJECT_PRODUCTION_URL'
  | 'VERCEL_URL'
  | '__NEXT_PRIVATE_ORIGIN'
>

export function normalizeHttpOrigin(
  value: string | undefined,
  variableName: string,
): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(`[env] ${variableName} must be an absolute http(s) URL.`)
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.pathname !== '/' && url.pathname !== '') ||
    url.search ||
    url.hash
  ) {
    throw new Error(`[env] ${variableName} must contain only an http(s) origin.`)
  }

  return url.origin
}

function parseVercelHostname(value: string | undefined, variableName: string): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  return normalizeHttpOrigin(
    trimmed.includes('://') ? trimmed : `https://${trimmed}`,
    variableName,
  )
}

export function getServerSideOrigin(
  environment: PublicUrlEnvironment = process.env,
): string {
  if (environment.VERCEL_ENV === 'preview' || environment.VERCEL_ENV === 'development') {
    return (
      parseVercelHostname(environment.VERCEL_URL, 'VERCEL_URL') ??
      normalizeHttpOrigin(environment.NEXT_PUBLIC_SERVER_URL, 'NEXT_PUBLIC_SERVER_URL') ??
      'http://localhost:3000'
    )
  }

  if (environment.VERCEL_ENV === 'production') {
    return (
      normalizeHttpOrigin(environment.NEXT_PUBLIC_SERVER_URL, 'NEXT_PUBLIC_SERVER_URL') ??
      productionSiteOrigin
    )
  }

  return (
    normalizeHttpOrigin(environment.NEXT_PUBLIC_SERVER_URL, 'NEXT_PUBLIC_SERVER_URL') ??
    normalizeHttpOrigin(environment.__NEXT_PRIVATE_ORIGIN, '__NEXT_PRIVATE_ORIGIN') ??
    parseVercelHostname(
      environment.VERCEL_PROJECT_PRODUCTION_URL,
      'VERCEL_PROJECT_PRODUCTION_URL',
    ) ??
    'http://localhost:3000'
  )
}

export function getCanonicalOrigin(
  environment: PublicUrlEnvironment = process.env,
): string {
  if (environment.NODE_ENV === 'production') return productionSiteOrigin

  return getServerSideOrigin(environment)
}

export function normalizePublicAssetOrigin(
  value: string | undefined,
  variableName = 'R2_PUBLIC_URL',
): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(`[env] ${variableName} must be an absolute http(s) URL.`)
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`[env] ${variableName} must be a public http(s) URL without credentials, query or hash.`)
  }

  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

export function isVercelPreview(environment: PublicUrlEnvironment = process.env): boolean {
  return environment.VERCEL_ENV === 'preview'
}
