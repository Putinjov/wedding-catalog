import type { Metadata } from 'next'

import { getDresses } from '@/lib/getDresses'

export const metadata: Metadata = {
  title: 'Wedding Dresses',
  description: 'Browse wedding dresses available for sale and rental.',
}

export default async function DressesPage() {
  const dresses = await getDresses()

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10">
        <p className="mb-2 text-sm uppercase tracking-[0.25em] text-neutral-500">
          Collection
        </p>

        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
          Wedding Dresses
        </h1>

        <p className="mt-4 max-w-2xl text-neutral-600">
          Discover dresses available for purchase or rental.
        </p>
      </div>

      {dresses.length === 0 ? (
        <p className="text-neutral-600">
          No dresses have been published yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {dresses.map((dress) => (
            <article key={dress.id}>
              <div className="aspect-[3/4] overflow-hidden bg-neutral-100">
                {typeof dress.mainImage === 'object' &&
                dress.mainImage?.url ? (
                  <img
                    src={dress.mainImage.url}
                    alt={dress.mainImage.alt || dress.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="mt-4">
                <h2 className="text-xl font-medium">{dress.name}</h2>

                <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-600">
                  {dress.forSale && dress.salePrice != null ? (
                    <span>Sale €{dress.salePrice}</span>
                  ) : null}

                  {dress.availableForRent && dress.rentalPrice != null ? (
                    <span>Rental €{dress.rentalPrice}</span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}