export function getDressPath(slug: string): string {
  return `/dresses/${encodeURIComponent(slug)}`
}
