import { getDressBySlug } from '@/lib/getDress'
import type { DressMode } from '@/lib/catalogue'
import { appendDressMode, getDressPath } from '@/utilities/dress-routing'
import { getCachedRedirects } from '@/utilities/getRedirects'

export { appendDressMode, getDressPath }

export async function getPublicDressRedirect(
  slug: string,
  mode: DressMode | null,
): Promise<string | null> {
  const sourcePath = getDressPath(slug)
  const redirects = await getCachedRedirects()()
  const redirectItem = redirects.find((item) => item.from === sourcePath)
  const reference = redirectItem?.to?.reference

  if (
    redirectItem?.to?.type !== 'reference' ||
    !reference ||
    reference.relationTo !== 'dresses' ||
    typeof reference.value !== 'object' ||
    !reference.value
  ) {
    return null
  }

  const dress = await getDressBySlug(reference.value.slug)

  if (!dress) {
    return null
  }

  const destination = getDressPath(dress.slug)

  if (destination === sourcePath) {
    return null
  }

  return appendDressMode(destination, mode)
}
