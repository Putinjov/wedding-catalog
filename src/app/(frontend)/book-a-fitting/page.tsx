import type { Metadata } from 'next'

import { BookingFlow } from '@/components/booking/booking-flow'
import { formatFittingFee } from '@/config/site'
import { getBookingDateBounds } from '@/lib/booking/date'
import { getInitialBookingPurpose } from '@/lib/booking/purpose'
import { getBookingSettings } from '@/lib/booking/settings'
import { isDressAvailableForMode } from '@/lib/dress-utils'
import { getDressBySlug } from '@/lib/getDress'

export const metadata: Metadata = {
  alternates: {
    canonical: '/book-a-fitting',
  },
  description: 'Book a private wedding dress fitting whether you plan to buy, rent, or decide during your appointment.',
  title: 'Book a fitting',
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

export default async function BookAFittingPage({ searchParams }: Args) {
  const query = await searchParams
  const dressSlug = getQueryValue(query.dress)
  const requestedPurpose = getQueryValue(query.purpose)
  const dress = dressSlug ? await getDressBySlug(decodeURIComponent(dressSlug)) : null
  const supportsBuy = dress ? isDressAvailableForMode(dress, 'buy') : false
  const supportsRent = dress ? isDressAvailableForMode(dress, 'rent') : false
  const selectedDress = dress
    ? {
        id: dress.id,
        name: dress.name,
        slug: dress.slug,
        supportsBuy,
        supportsRent,
      }
    : null
  const settings = await getBookingSettings()
  const { maxDate, minDate } = getBookingDateBounds(settings)
  const requestedDate = getQueryValue(query.date)
  const initialDate = requestedDate && requestedDate >= minDate && requestedDate <= maxDate
    ? requestedDate
    : ''
  const requestedTime = getQueryValue(query.time)
  const initialTime = requestedTime && /^\d{2}:\d{2}$/.test(requestedTime) ? requestedTime : ''

  return (
    <main className="bg-background">
      <section className="container grid gap-12 pb-16 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-16 md:px-8 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
            Private fitting
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-foreground sm:text-6xl md:text-7xl">
            Find time for the dress.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Tell us whether you are looking to buy, rent, or would prefer to decide during your
            private appointment.
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
          initialPurpose={getInitialBookingPurpose(requestedPurpose, selectedDress)}
          initialTime={initialTime}
          maxDate={maxDate}
          minDate={minDate}
          selectedDress={selectedDress}
          settings={settings}
          syncURLState
        />
      </section>
    </main>
  )
}
