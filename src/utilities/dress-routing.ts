import type { DressMode } from '@/lib/catalogue'

export function getDressPath(slug: string): string {
  return `/dresses/${encodeURIComponent(slug)}`
}

export function appendDressMode(path: string, mode: DressMode | null): string {
  return mode ? `${path}?mode=${mode}` : path
}
