import type { Dress, DressesSelect, MediaSelect } from '@/payload-types'

export const dressCardSelect = {
  name: true,
  slug: true,
  designer: true,
  silhouette: true,
  condition: true,
  featured: true,
  saleStatus: true,
  salePrice: true,
  salePriceOnRequest: true,
  previousSalePrice: true,
  rentalStatus: true,
  rentalPrice: true,
  mainImage: true,
} as const satisfies DressesSelect

export type DressCardRecord = Pick<Dress, 'id' | keyof typeof dressCardSelect>

export const relatedRankSelect = {
  category: true,
  silhouette: true,
  designer: true,
  salePrice: true,
  rentalPrice: true,
  featured: true,
  displayOrder: true,
  createdAt: true,
} as const satisfies DressesSelect

export type RelatedRankRecord = Pick<Dress, 'id' | keyof typeof relatedRankSelect>

export const dressCardMediaSelect = {
  alt: true,
  prefix: true,
  url: true,
  width: true,
  height: true,
  mimeType: true,
  updatedAt: true,
  createdAt: true,
  sizes: {
    small: true,
    medium: true,
    large: true,
  },
} as const satisfies MediaSelect

export const dressCardPopulate = {
  designers: { name: true },
  silhouettes: { name: true },
  media: dressCardMediaSelect,
} as const
