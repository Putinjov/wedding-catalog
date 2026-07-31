import type { Dress, Media as MediaType } from '@/payload-types'
import type { DressMode } from '@/lib/catalogue'

type RecordValue = Record<string, unknown>

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null
}

export function getRelationshipLabel(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }

  for (const key of ['name', 'title', 'label']) {
    const label = value[key]
    if (typeof label === 'string' && label.length > 0) {
      return label
    }
  }

  return null
}

export function getRelationshipLabels(values: readonly unknown[] | null | undefined): string[] {
  return (values ?? []).flatMap((value) => {
    const label = getRelationshipLabel(value)
    return label ? [label] : []
  })
}

export function getPopulatedMedia(value: unknown): MediaType | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.url !== 'string' ||
    value.url.length === 0
  ) {
    return null
  }

  return value as unknown as MediaType
}

const saleStatusLabels: Record<Dress['saleStatus'], string> = {
  'not-for-sale': 'Not offered for sale',
  available: 'Available to buy',
  reserved: 'Reserved for sale',
  sold: 'Sold',
}

const rentalStatusLabels: Record<Dress['rentalStatus'], string> = {
  'not-for-rent': 'Not offered for rental',
  available: 'Available to rent',
  reserved: 'Reserved for rental',
  rented: 'Currently rented',
  cleaning: 'Preparing for rental',
  repair: 'Temporarily unavailable for rental',
}

export function getAvailabilityLabel(dress: Dress, mode: DressMode): string {
  return mode === 'buy'
    ? saleStatusLabels[dress.saleStatus]
    : rentalStatusLabels[dress.rentalStatus]
}

export function isDressAvailableForMode(dress: Dress, mode: DressMode): boolean {
  return mode === 'buy'
    ? dress.saleStatus === 'available'
    : dress.rentalStatus === 'available'
}

export function isDressPublic(dress: Dress): boolean {
  return dress.publicVisibility === 'public'
}

export function supportsDressMode(dress: Dress, mode: DressMode): boolean {
  return mode === 'buy'
    ? dress.saleStatus !== 'not-for-sale'
    : dress.rentalStatus !== 'not-for-rent'
}

export function getSupportedDressModes(dress: Dress): DressMode[] {
  return [
    ...(supportsDressMode(dress, 'buy') ? (['buy'] as const) : []),
    ...(supportsDressMode(dress, 'rent') ? (['rent'] as const) : []),
  ]
}

export function isUnavailableForMode(dress: Dress, mode: DressMode): boolean {
  return !isDressAvailableForMode(dress, mode)
}

export function getConditionLabel(condition: Dress['condition']): string {
  const labels: Record<Dress['condition'], string> = {
    new: 'New',
    'like-new': 'Like new',
    excellent: 'Excellent',
    good: 'Good',
    'needs-cleaning': 'Needs cleaning',
    'needs-repair': 'Needs repair',
  }

  return labels[condition]
}
