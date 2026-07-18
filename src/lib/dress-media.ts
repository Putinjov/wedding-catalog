import type { Payload } from 'payload'

import type { Dress, Media } from '@/payload-types'

type MediaSize = NonNullable<Media['sizes']>[keyof NonNullable<Media['sizes']>]

export type DressMediaImage = {
  alt: string
  full: Media
  card: Media
  thumbnail: Media
}

export type DressMediaViewModel = {
  gallery: DressMediaImage[]
  main: DressMediaImage | null
}

export type DressWithMedia = Dress & {
  media: DressMediaViewModel
}

type MediaLookup = ReadonlyMap<string, Media>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getMediaID(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (!isRecord(value)) return null
  return typeof value.id === 'string' && value.id.length > 0 ? value.id : null
}

function hasUsableURL(resource: Media): boolean {
  if (typeof resource.url === 'string' && resource.url.length > 0) return true

  return Object.values(resource.sizes ?? {}).some(
    (size) => typeof size?.url === 'string' && size.url.length > 0,
  )
}

function getPopulatedMedia(value: unknown): Media | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const resource = value as unknown as Media
  return hasUsableURL(resource) ? resource : null
}

function withPreferredSize(resource: Media, names: string[]): Media {
  const sizes = resource.sizes ?? {}
  const selected = names
    .map((name) => sizes[name as keyof typeof sizes] as MediaSize)
    .find((size) => typeof size?.url === 'string' && size.url.length > 0)

  if (!selected?.url) return resource

  return {
    ...resource,
    height: selected.height ?? resource.height,
    mimeType: selected.mimeType ?? resource.mimeType,
    url: selected.url,
    width: selected.width ?? resource.width,
  }
}

function resolveReference(value: unknown, mediaByID: MediaLookup): Media | null {
  const populated = getPopulatedMedia(value)
  if (populated) return populated

  const id = getMediaID(value)
  return id ? mediaByID.get(id) ?? null : null
}

function toViewImage(resource: Media, alt: string): DressMediaImage {
  return {
    alt: alt || resource.alt || '',
    card: withPreferredSize(resource, ['medium', 'small', 'large']),
    full: withPreferredSize(resource, ['xlarge', 'large', 'medium', 'small']),
    thumbnail: withPreferredSize(resource, ['thumbnail', 'small', 'square']),
  }
}

export function normalizeDressMedia(
  dress: Dress,
  mediaByID: MediaLookup = new Map(),
): DressMediaViewModel {
  const gallery: DressMediaImage[] = []
  const seen = new Set<string>()
  const mainResource = resolveReference(dress.mainImage, mediaByID)
  const main = mainResource ? toViewImage(mainResource, mainResource.alt || dress.name) : null

  if (mainResource && main) {
    gallery.push(main)
    seen.add(mainResource.id)
  }

  for (const row of dress.gallery ?? []) {
    const resource = resolveReference(row.image, mediaByID)
    if (!resource || seen.has(resource.id)) continue

    gallery.push(toViewImage(resource, row.alt || resource.alt || dress.name))
    seen.add(resource.id)
  }

  return { gallery, main }
}

function getUnresolvedMediaIDs(dresses: readonly Dress[]): string[] {
  const ids = new Set<string>()

  for (const dress of dresses) {
    for (const value of [dress.mainImage, ...(dress.gallery ?? []).map((row) => row.image)]) {
      if (getPopulatedMedia(value)) continue
      const id = getMediaID(value)
      if (id) ids.add(id)
    }
  }

  return [...ids]
}

export async function attachDressMedia(
  dresses: readonly Dress[],
  payload: Payload,
): Promise<DressWithMedia[]> {
  const unresolvedIDs = getUnresolvedMediaIDs(dresses)
  const mediaByID = new Map<string, Media>()

  if (unresolvedIDs.length > 0) {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: unresolvedIDs.length,
      pagination: false,
      where: { id: { in: unresolvedIDs } },
    })

    for (const resource of result.docs) {
      if (hasUsableURL(resource)) mediaByID.set(resource.id, resource)
    }
  }

  return dresses.map((dress) => {
    const media = normalizeDressMedia(dress, mediaByID)
    const expectedCount = 1 + (dress.gallery?.length ?? 0)

    if (media.gallery.length === 0 && expectedCount > 0) {
      console.warn(`[dress-media] Dress ${dress.id} has no resolvable uploaded media.`)
    } else if (media.gallery.length < expectedCount) {
      console.warn(`[dress-media] Dress ${dress.id} contains unresolved or duplicate media rows.`)
    }

    return { ...dress, media }
  })
}
