import type { Metadata } from 'next'

import { BookingFlow } from '@/components/booking/booking-flow'
import { formatFittingFee, siteConfig } from '@/config/site'
import type { BookingPurpose } from '@/config/booking'
import { getBookingDateBounds } from '@/lib/booking/date'
import { getDressBySlug } from '@/lib/getDress'

export const metadata: Metadata = {
  title: `Book a fitting | ${siteConfig.name}`,
  description: 'Choose whether your private fitting is for buying or renting a wedding dress.',
}

type Args = {
  searchParams: Promise<{
    date?: string | string[]
    dress?: string | string[]
    purpose?: string | string[]
    time?: string | string[]
  }>
}

function getQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function getInitialPurpose(
  requestedPurpose: string | undefined,
  selectedDress: { supportsBuy: boolean; supportsRent: boolean } | null,
): BookingPurpose {
  if (!selectedDress) {
    return requestedPurpose === 'rent' ? 'rent' : 'buy'
  }

  if (requestedPurpose === 'buy' && selectedDress.supportsBuy) {
    return 'buy'
  }

  if (requestedPurpose === 'rent' && selectedDress.supportsRent) {
    return 'rent'
  }

  return selectedDress.supportsBuy ? 'buy' : 'rent'
}

export default async function BookAFittingPage({ searchParams }: Args) {
  const query = await searchParams
  const dressSlug = getQueryValue(query.dress)
  const requestedPurpose = getQueryValue(query.purpose)
  const dress = dressSlug ? await getDressBySlug(decodeURIComponent(dressSlug)) : null
  const selectedDress =
    dress && (dress.forSale || dress.availableForRent)
      ? {
          id: dress.id,
          name: dress.name,
          slug: dress.slug,
          supportsBuy: Boolean(dress.forSale),
          supportsRent: Boolean(dress.availableForRent),
        }
      : null
  const { maxDate, minDate } = getBookingDateBounds()
  const requestedDate = getQueryValue(query.date)
  const initialDate = requestedDate && requestedDate >= minDate && requestedDate <= maxDate
    ? requestedDate
    : ''
  const requestedTime = getQueryValue(query.time)
  const initialTime = requestedTime && /^\d{2}:\d{2}$/.test(requestedTime) ? requestedTime : ''

  return (
    <main className="bg-background">
      <section className="container grid gap-12 py-16 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
            Private fitting
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl md:text-7xl">
            Find time for the dress.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Tell us whether you are looking to buy or rent, and we will prepare the right edit for
            your private appointment.
          </p>
          <div className="mt-8 border-l-2 border-brand-antique-gold pl-5">
            <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
              Booking fee
            </p>
            <p className="mt-2 font-serif text-4xl text-brand-deep-lavender">{formatFittingFee()}</p>
          </div>
        </div>

        <BookingFlow
          initialDate={initialDate}
          initialPurpose={getInitialPurpose(requestedPurpose, selectedDress)}
          initialTime={initialTime}
          maxDate={maxDate}
          minDate={minDate}
          selectedDress={selectedDress}
          syncURLState
        />
      </section>
    </main>
  )
}
