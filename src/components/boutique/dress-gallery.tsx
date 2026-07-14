'use client'

import { useState } from 'react'

import { Media } from '@/components/Media'
import type { Media as MediaType } from '@/payload-types'

export type DressGalleryImage = {
  alt: string
  resource: MediaType
}

export function DressGallery({
  images,
  name,
}: {
  images: DressGalleryImage[]
  name: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center bg-secondary px-8 text-center text-sm text-muted-foreground">
        Image coming soon
      </div>
    )
  }

  const activeImage = images[activeIndex] ?? images[0]

  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
        <Media
          alt={activeImage.alt || name}
          className="relative block h-full w-full"
          fill
          imgClassName="object-cover"
          pictureClassName="relative block h-full w-full"
          priority
          resource={activeImage.resource}
          size="(max-width: 1023px) 100vw, 58vw"
        />
      </div>

      {images.length > 1 ? (
        <div
          aria-label={`${name} image gallery`}
          className="mt-4 flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4"
          role="list"
        >
          {images.map((image, index) => (
            <button
              aria-label={`View ${name} image ${index + 1}`}
              aria-pressed={index === activeIndex}
              className="relative aspect-[3/4] min-w-20 overflow-hidden bg-secondary outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2 lg:min-w-0"
              key={`${image.resource.id}-${index}`}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <Media
                alt=""
                className="relative block h-full w-full"
                fill
                imgClassName="object-cover"
                pictureClassName="relative block h-full w-full"
                resource={image.resource}
                size="96px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
