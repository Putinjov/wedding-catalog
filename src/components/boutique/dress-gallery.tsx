'use client'

import { ChevronLeft, ChevronRight, Expand, Play, ZoomIn, ZoomOut } from 'lucide-react'
import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react'

import { Media } from '@/components/Media'
import { defaultImageQuality, mainGalleryImageQuality } from '@/config/images'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  normalizeDressVideoUrl,
  type DressMediaImage,
  type DressVideo,
} from '@/lib/dress-media'
import { cn } from '@/utilities/ui'

type GalleryItem =
  | { image: DressMediaImage; type: 'image' }
  | { type: 'video'; video: DressVideo }

function ProductVideo({ name, video }: { name: string; video: DressVideo }) {
  if (video.kind === 'hosted') {
    return (
      <video
        aria-label={`${name} product video`}
        className="h-full w-full bg-brand-charcoal object-contain"
        controls
        playsInline
        preload="metadata"
        src={video.url}
      />
    )
  }

  return (
    <iframe
      allow="fullscreen; picture-in-picture"
      allowFullScreen
      className="h-full w-full border-0"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      src={video.url}
      title={`${name} product video`}
    />
  )
}

export function DressGallery({
  images,
  name,
  videoUrl,
}: {
  images: DressMediaImage[]
  name: string
  videoUrl?: string | null
}) {
  const video = normalizeDressVideoUrl(videoUrl)
  const items: GalleryItem[] = [
    ...images.map((image): GalleryItem => ({ image, type: 'image' })),
    ...(video ? ([{ type: 'video', video }] as const) : []),
  ]
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center bg-secondary px-8 text-center text-sm text-muted-foreground">
        Image coming soon
      </div>
    )
  }

  const activeItem = items[activeIndex] ?? items[0]
  const activeImage = activeItem.type === 'image' ? activeItem.image : null

  function selectIndex(index: number) {
    const normalizedIndex = (index + items.length) % items.length
    if (lightboxOpen && items[normalizedIndex]?.type === 'video') {
      setLightboxOpen(false)
    }
    setActiveIndex(normalizedIndex)
    setZoomed(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      selectIndex(activeIndex - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      selectIndex(activeIndex + 1)
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' || zoomed) return
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current
    pointerStart.current = null
    if (!start || start.id !== event.pointerId || zoomed) return

    const horizontal = event.clientX - start.x
    const vertical = event.clientY - start.y
    if (Math.abs(horizontal) < 48 || Math.abs(horizontal) <= Math.abs(vertical)) return
    selectIndex(activeIndex + (horizontal < 0 ? 1 : -1))
  }

  const galleryImage = activeImage ? (
    <Media
      alt={activeImage.alt || name}
      className="relative block h-full w-full"
      fill
      imgClassName="object-cover"
      pictureClassName="relative block h-full w-full"
      priority={activeIndex === 0}
      quality={mainGalleryImageQuality}
      resource={activeImage.full}
      size="(max-width: 1023px) 100vw, 58vw"
    />
  ) : null

  return (
    <Dialog
      onOpenChange={(open) => {
        setLightboxOpen(open)
        if (!open) setZoomed(false)
      }}
      open={lightboxOpen}
    >
      <div aria-label={`${name} gallery`} onKeyDown={handleKeyDown}>
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          {activeImage ? (
            <DialogTrigger asChild>
              <button
                aria-label={`Open ${name} image ${activeIndex + 1} full screen`}
                className="group relative block h-full w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-deep-lavender"
                type="button"
              >
                {galleryImage}
                <span className="absolute bottom-3 right-3 flex size-11 items-center justify-center bg-background/90 text-foreground">
                  <Expand aria-hidden="true" className="size-5" />
                </span>
              </button>
            </DialogTrigger>
          ) : activeItem.type === 'video' ? (
            <ProductVideo name={name} video={activeItem.video} />
          ) : null}
        </div>

        <p aria-live="polite" className="sr-only">
          {activeItem.type === 'video'
            ? `Video ${activeIndex + 1} of ${items.length}`
            : `Image ${activeIndex + 1} of ${items.length}`}
        </p>

        {items.length > 1 ? (
          <div
            aria-label={`${name} gallery items`}
            className="mt-4 flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4"
            role="list"
          >
            {items.map((item, index) => (
              <div className="min-w-20 lg:min-w-0" key={item.type === 'image' ? `${item.image.full.id}-${index}` : `video-${index}`} role="listitem">
                <button
                  aria-label={item.type === 'image' ? `View ${name} image ${index + 1}` : `Play ${name} product video`}
                  aria-pressed={index === activeIndex}
                  className="relative aspect-[3/4] w-full overflow-hidden bg-secondary outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2 motion-reduce:transition-none"
                  onClick={() => selectIndex(index)}
                  type="button"
                >
                  {item.type === 'image' ? (
                    <Media
                      alt=""
                      className="relative block h-full w-full"
                      fill
                      imgClassName="object-cover"
                      pictureClassName="relative block h-full w-full"
                      quality={defaultImageQuality}
                      resource={item.image.thumbnail}
                      size="96px"
                    />
                  ) : (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-brand-charcoal text-white">
                      <Play aria-hidden="true" className="size-6" />
                      <span className="text-xs uppercase tracking-wider">Video</span>
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {activeImage ? (
        <DialogContent
          closeLabel="Close image gallery"
          className="h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden border-0 bg-brand-charcoal p-0 text-white sm:h-[calc(100dvh-2rem)] sm:max-w-[calc(100vw-2rem)]"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">{name} image gallery</DialogTitle>
          <DialogDescription className="sr-only">
            Use the previous and next buttons or arrow keys to move between images. Press Escape to close.
          </DialogDescription>
          <div
            className="h-full touch-pan-y overflow-auto"
            onPointerCancel={() => {
              pointerStart.current = null
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            <div className="relative flex h-full min-h-full items-center justify-center overflow-hidden p-4 sm:p-12">
              <Media
                alt={activeImage.alt || name}
                className={cn(
                  'relative block h-full w-full motion-safe:transition-transform motion-reduce:transition-none',
                  zoomed && 'scale-150 cursor-zoom-out',
                )}
                fill
                imgClassName="object-contain"
                pictureClassName="relative block h-full w-full"
                quality={mainGalleryImageQuality}
                resource={activeImage.full}
                size="100vw"
              />
            </div>
          </div>
          {items.length > 1 ? (
            <>
              <button
                aria-label="Previous gallery item"
                className="absolute left-2 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center bg-background/95 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-antique-gold sm:left-4"
                onClick={() => selectIndex(activeIndex - 1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-6" />
              </button>
              <button
                aria-label="Next gallery item"
                className="absolute right-2 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center bg-background/95 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-antique-gold sm:right-4"
                onClick={() => selectIndex(activeIndex + 1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-6" />
              </button>
            </>
          ) : null}
          <button
            aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
            aria-pressed={zoomed}
            className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-10 flex size-11 items-center justify-center bg-background/95 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-antique-gold"
            onClick={() => setZoomed((current) => !current)}
            type="button"
          >
            {zoomed ? <ZoomOut aria-hidden="true" /> : <ZoomIn aria-hidden="true" />}
          </button>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
