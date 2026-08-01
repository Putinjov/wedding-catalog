import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DressGallery } from '@/components/boutique/dress-gallery'
import { normalizeDressVideoUrl, type DressMediaImage } from '@/lib/dress-media'
import type { Media as MediaType } from '@/payload-types'

vi.mock('@/components/Media', () => ({
  Media: ({ alt, priority }: { alt: string; priority?: boolean }) => (
    <span aria-label={alt || 'decorative image'} data-priority={priority ? 'true' : 'false'} />
  ),
}))

afterEach(cleanup)

function image(id: string): DressMediaImage {
  const resource: MediaType = {
    alt: `Image ${id}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    height: 1200,
    id,
    updatedAt: '2026-01-01T00:00:00.000Z',
    url: `/media/${id}.webp`,
    width: 900,
  }

  return { alt: `Image ${id}`, card: resource, full: resource, thumbnail: resource }
}

describe('dress gallery', () => {
  it('opens an accessible lightbox and supports keyboard navigation, zoom and Escape', () => {
    render(<DressGallery images={[image('one'), image('two')]} name="Grace" />)

    expect(screen.getByLabelText('Image one').getAttribute('data-priority')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Open Grace image 1 full screen' }))

    const dialog = screen.getByRole('dialog', { name: 'Grace image gallery' })
    expect(dialog).toBeTruthy()
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(screen.getByText('Image 2 of 2')).toBeTruthy()

    const zoom = screen.getByRole('button', { name: 'Zoom in' })
    fireEvent.click(zoom)
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeTruthy()

    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Grace image gallery' })).toBeNull()
  })

  it('normalizes supported CMS video URLs without enabling autoplay', () => {
    expect(normalizeDressVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    })
    expect(normalizeDressVideoUrl('https://vimeo.com/123456')).toEqual({
      kind: 'vimeo',
      url: 'https://player.vimeo.com/video/123456',
    })
    expect(normalizeDressVideoUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeDressVideoUrl('https://example.com/product.html')).toBeNull()

    render(
      <DressGallery
        images={[image('one')]}
        name="Grace"
        videoUrl="https://cdn.example.com/grace.mp4"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Play Grace product video' }))

    const video = screen.getByLabelText('Grace product video')
    expect(video.getAttribute('controls')).not.toBeNull()
    expect(video.getAttribute('autoplay')).toBeNull()
    expect(video.getAttribute('preload')).toBe('metadata')
  })
})
