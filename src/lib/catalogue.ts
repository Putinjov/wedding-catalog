export type DressMode = 'buy' | 'rent'
export type CatalogueMode = DressMode
export type DressDisplayMode = 'all' | CatalogueMode

export const catalogueContent: Record<
  CatalogueMode,
  {
    eyebrow: string
    title: string
    description: string
  }
> = {
  buy: {
    eyebrow: 'Buy wedding dresses',
    title: 'Find the one to keep',
    description: 'Explore new and selected wedding dresses available to purchase.',
  },
  rent: {
    eyebrow: 'Rent wedding dresses',
    title: 'Wear the dream for less',
    description: 'Choose a beautiful gown for your day without the full purchase price.',
  },
}
