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

const availabilityLabels: Record<Dress['availabilityStatus'], string> = {
  available: 'Available',
  reserved: 'Reserved',
  rented: 'Currently rented',
  sold: 'Sold',
  cleaning: 'Preparing',
  repair: 'Temporarily unavailable',
  hidden: 'Hidden',
}

export function getAvailabilityLabel(status: Dress['availabilityStatus']): string {
  return availabilityLabels[status]
}

export function isUnavailableForMode(dress: Dress, mode: DressMode): boolean {
  if (mode === 'buy') {
    return dress.availabilityStatus === 'sold'
  }

  return ['rented', 'reserved', 'cleaning', 'repair'].includes(dress.availabilityStatus)
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
