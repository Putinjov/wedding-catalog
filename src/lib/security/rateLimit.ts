import { createHash } from 'node:crypto'

type RateLimitRule = {
  identifier: string
  limit: number
  namespace: string
  windowMs: number
}

type RateLimitEntry = {
  count: number
  expiresAt: number
}

const buckets = new Map<string, RateLimitEntry>()

function anonymise(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

function getClientIP(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headers.get('x-real-ip')?.trim() || 'unknown'
}

export function ipRateLimitRule(
  headers: Headers,
  namespace: string,
  limit: number,
  windowMs: number,
): RateLimitRule {
  return { identifier: getClientIP(headers), limit, namespace: `${namespace}:ip`, windowMs }
}

export function identifierRateLimitRule(
  identifier: string,
  namespace: string,
  limit: number,
  windowMs: number,
): RateLimitRule {
  return { identifier, limit, namespace, windowMs }
}

export function consumeRateLimits(rules: RateLimitRule[]): boolean {
  const now = Date.now()
  const resolved = rules.map((rule) => {
    const key = `${rule.namespace}:${anonymise(rule.identifier)}`
    const existing = buckets.get(key)
    return {
      entry:
        existing && existing.expiresAt > now
          ? existing
          : { count: 0, expiresAt: now + rule.windowMs },
      key,
      rule,
    }
  })

  if (resolved.some(({ entry, rule }) => entry.count >= rule.limit)) return false

  for (const { entry, key } of resolved) {
    entry.count += 1
    buckets.set(key, entry)
  }

  // Keep the process-local store bounded on long-lived instances.
  if (buckets.size > 10_000) {
    for (const [key, entry] of buckets) {
      if (entry.expiresAt <= now) buckets.delete(key)
    }
  }

  return true
}

// TODO: Replace this process-local limiter with a shared Redis/KV-backed limiter
// before horizontal scaling, and add CAPTCHA when the deployment supports it.
