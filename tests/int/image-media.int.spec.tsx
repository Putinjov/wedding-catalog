import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ImageMedia } from '@/components/Media/ImageMedia'
import type { Media } from '@/payload-types'

const imageMediaSource = readFileSync(
  resolve(process.cwd(), 'src/components/Media/ImageMedia/index.tsx'),
  'utf8',
)
const dressGallerySource = readFileSync(
  resolve(process.cwd(), 'src/components/boutique/dress-gallery.tsx'),
  'utf8',
)

describe('ImageMedia server boundary', () => {
  it('keeps the non-interactive image wrapper outside the client boundary', () => {
    expect(imageMediaSource).not.toMatch(/['"]use client['"]/)
    expect(dressGallerySource).toMatch(/^\s*['"]use client['"]/)
  })

  it('renders Payload media to static markup', () => {
    const resource: Media = {
      alt: 'Grace wedding dress',
      createdAt: '2026-01-01T00:00:00.000Z',
      height: 1200,
      id: 'media-1',
      updatedAt: '2026-01-01T00:00:00.000Z',
      url: '/api/media/file/grace.webp',
      width: 900,
    }

    const markup = renderToStaticMarkup(
      <ImageMedia pictureClassName="catalogue-image" resource={resource} size="25vw" />,
    )

    expect(markup).toContain('<picture class="catalogue-image">')
    expect(markup).toContain('alt="Grace wedding dress"')
    expect(markup).toContain('sizes="25vw"')
  })
})
