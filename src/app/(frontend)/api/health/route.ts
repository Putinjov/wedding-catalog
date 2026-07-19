import { getPayload } from 'payload'

import { getServerEnvironment } from '@/config/env'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const healthCheckTimeoutMs = 2_500

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Health check timed out.')), timeoutMs)

    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })
}

export async function GET(): Promise<Response> {
  const checkedAt = new Date().toISOString()

  try {
    getServerEnvironment()
    const { default: config } = await import('@payload-config')
    const payload = await withTimeout(getPayload({ config }), healthCheckTimeoutMs)
    await withTimeout(
      payload.find({
        collection: 'users',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
      }),
      healthCheckTimeoutMs,
    )

    return Response.json(
      { checkedAt, database: 'reachable', status: 'ok' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return Response.json(
      { checkedAt, database: 'unavailable', status: 'degraded' },
      { headers: { 'Cache-Control': 'no-store' }, status: 503 },
    )
  }
}
