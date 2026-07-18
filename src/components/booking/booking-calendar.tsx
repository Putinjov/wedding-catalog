'use client'

import { Calendar } from '@/components/ui/calendar'
import { isClosedDate } from '@/lib/booking/date'

function dateKeyToLocalDate(dateKey: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
}

export function localDateToDateKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

export function isBookingDateUnavailable({
  date,
  fullyBookedDates,
  maxDate,
  minDate,
}: {
  date: Date
  fullyBookedDates: ReadonlySet<string>
  maxDate: string
  minDate: string
}): boolean {
  const dateKey = localDateToDateKey(date)
  return (
    dateKey < minDate ||
    dateKey > maxDate ||
    isClosedDate(dateKey) ||
    fullyBookedDates.has(dateKey)
  )
}

export function BookingCalendar({
  fullyBookedDates,
  maxDate,
  minDate,
  onSelect,
  selectedDate,
}: {
  fullyBookedDates: string[]
  maxDate: string
  minDate: string
  onSelect: (dateKey: string) => void
  selectedDate: string
}) {
  const fullyBooked = new Set(fullyBookedDates)
  const selected = dateKeyToLocalDate(selectedDate)
  const startMonth = dateKeyToLocalDate(minDate)
  const endMonth = dateKeyToLocalDate(maxDate)

  return (
    <div className="max-w-xl overflow-hidden border border-brand-warm-border bg-background p-3 sm:p-5">
      <Calendar
        defaultMonth={selected ?? startMonth}
        disabled={(date) =>
          isBookingDateUnavailable({ date, fullyBookedDates: fullyBooked, maxDate, minDate })
        }
        endMonth={endMonth}
        fixedWeeks
        labels={{
          labelNext: () => 'Go to next month',
          labelPrevious: () => 'Go to previous month',
        }}
        mode="single"
        onSelect={(date) => {
          if (date) onSelect(localDateToDateKey(date))
        }}
        selected={selected}
        startMonth={startMonth}
      />
      <div aria-label="Calendar legend" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-brand-warm-border pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><span aria-hidden="true" className="size-4 bg-brand-deep-lavender" />Selected</span>
        <span className="flex items-center gap-2"><span aria-hidden="true" className="size-4 border border-brand-antique-gold bg-background" />Today</span>
        <span className="flex items-center gap-2"><span aria-hidden="true" className="size-4 bg-secondary" />Unavailable</span>
      </div>
    </div>
  )
}
