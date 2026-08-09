import { timingSafeEqual } from 'node:crypto'

export const privateCronResponseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

export function isCronRequestAuthorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false

  const authorization = request.headers.get('authorization')
  const expected = `Bearer ${secret}`
  if (!authorization || authorization.length !== expected.length) return false

  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
}
