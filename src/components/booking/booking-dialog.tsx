'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

import { BookingFlow } from '@/components/booking/booking-flow'
import type { SelectedDressSummary } from '@/components/booking/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { BookingPurpose, ResolvedBookingSettings } from '@/config/booking'
import { isFittingFeeWaived } from '@/lib/booking/fittingFee'
import { cn } from '@/utilities/ui'

export function BookingDialog({
  dialogID,
  fallbackHref,
  initialPurpose,
  maxDate,
  minDate,
  mobileClassName,
  mobileLabel,
  primaryClassName,
  primaryLabel,
  secondaryClassName,
  secondaryLabel,
  selectedDress,
  settings,
}: {
  dialogID: string
  fallbackHref: string
  initialPurpose: BookingPurpose
  maxDate: string
  minDate: string
  mobileClassName?: string
  mobileLabel?: string
  primaryClassName?: string
  primaryLabel: string
  secondaryClassName?: string
  secondaryLabel?: string
  selectedDress: SelectedDressSummary | null
  settings: ResolvedBookingSettings
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const open = searchParams.get('booking') === dialogID

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      const params = new URLSearchParams(searchParams.toString())
      if (nextOpen) {
        params.set('booking', dialogID)
        params.set('purpose', initialPurpose)
        if (selectedDress) params.set('dress', selectedDress.slug)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      } else {
        params.delete('booking')
        router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, {
          scroll: false,
        })
      }
    },
    [dialogID, initialPurpose, pathname, router, searchParams, selectedDress],
  )

  const trigger = (label: string, className?: string) => (
    <DialogTrigger asChild>
      <button className={cn(className, 'hidden lg:inline-flex')} type="button">
        {label}
      </button>
    </DialogTrigger>
  )

  return (
    <>
      <Link
        className={cn(
          'inline-flex min-h-11 items-center justify-center text-center lg:hidden',
          mobileClassName ?? primaryClassName,
        )}
        href={fallbackHref}
      >
        {mobileLabel ?? primaryLabel}
      </Link>
      <Dialog onOpenChange={updateOpen} open={open}>
        {trigger(primaryLabel, primaryClassName)}
        {secondaryLabel ? trigger(secondaryLabel, secondaryClassName) : null}
        <DialogContent closeLabel="Close booking dialog" className="max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain p-7 pt-14">
          <DialogTitle className="sr-only">Book a private fitting</DialogTitle>
          <DialogDescription className="sr-only">
            {isFittingFeeWaived()
              ? 'Choose a fitting purpose, date and time, enter your details, then confirm your free appointment.'
              : 'Choose a fitting purpose, date and time, enter your details, then continue to payment.'}
          </DialogDescription>
          <BookingFlow
            initialDate={searchParams.get('date') ?? ''}
            initialPurpose={initialPurpose}
            initialTime={searchParams.get('time') ?? ''}
            maxDate={maxDate}
            minDate={minDate}
            selectedDress={selectedDress}
            settings={settings}
            syncURLState
          />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Prefer a full page? <Link className="underline" href={fallbackHref}>Open booking page</Link>
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
