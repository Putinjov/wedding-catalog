import type { StaticImageData } from 'next/image'
import type { ElementType, Ref } from 'react'

import type { ImageQuality } from '@/config/images'
import type { Media as MediaType } from '@/payload-types'

interface BaseProps {
  alt?: string
  className?: string
  htmlElement?: ElementType | null
  pictureClassName?: string
  imgClassName?: string
  onClick?: () => void
  onLoad?: () => void
  loading?: 'lazy' | 'eager' // for NextImage only
  priority?: boolean // for NextImage only
  quality?: ImageQuality // for NextImage only
  ref?: Ref<HTMLImageElement | HTMLVideoElement | null>
  resource?: MediaType | string | number | null // for Payload media
  src?: StaticImageData // for static media
  videoClassName?: string
}

type FillImageProps = BaseProps & {
  fill: true
  size: string
}

type IntrinsicImageProps = BaseProps & {
  fill?: false
  size?: string
}

export type Props = FillImageProps | IntrinsicImageProps
