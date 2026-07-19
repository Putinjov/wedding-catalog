import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET as getHealth } from '@/app/(frontend)/api/health/route'
import { GET as getSitemapIndex } from '@/app/(frontend)/(sitemaps)/sitemap.xml/route'
import { POST as seedDatabase } from '@/app/(frontend)/next/seed/route'
import { GET as getRobots } from '@/app/(frontend)/robots.txt/route'

describe('deployment routes', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports a database-backed healthy startup without exposing configuration', async () => {
    const response = await getHealth()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({ database: 'reachable', status: 'ok' }),
    )
    expect(JSON.stringify(body)).not.toMatch(/DATABASE_URL|PAYLOAD_SECRET|mongodb/i)
  })

  it('disallows indexing for Vercel preview deployments', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')

    const response = getRobots()

    await expect(response.text()).resolves.toBe('User-agent: *\nDisallow: /\n')
  })

  it('lists each dynamic Payload sitemap exactly once', async () => {
    const response = await getSitemapIndex()
    const body = await response.text()

    expect(body.match(/pages-sitemap\.xml/g)).toHaveLength(1)
    expect(body.match(/posts-sitemap\.xml/g)).toHaveLength(1)
  })

  it('disables the destructive demo seed endpoint in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const response = await seedDatabase()

    expect(response.status).toBe(404)
  })
})
