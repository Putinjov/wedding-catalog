import type { BookingPurpose } from '@/config/booking'

export function BookingSummary({
  date,
  dressName,
  duration,
  fee,
  purpose,
  time,
}: {
  date: string
  dressName?: string | null
  duration?: string
  fee?: string
  purpose: BookingPurpose
  time: string
}) {
  return (
    <dl className="divide-y divide-brand-warm-border border-y border-brand-warm-border">
      <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
        <dt className="text-sm text-muted-foreground">Purpose</dt>
        <dd className="font-medium capitalize text-foreground">{purpose}</dd>
      </div>
      {dressName ? (
        <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
          <dt className="text-sm text-muted-foreground">Dress</dt>
          <dd className="font-medium text-foreground">{dressName}</dd>
        </div>
      ) : null}
      <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
        <dt className="text-sm text-muted-foreground">Date</dt>
        <dd className="font-medium text-foreground">{date}</dd>
      </div>
      <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
        <dt className="text-sm text-muted-foreground">Time</dt>
        <dd className="font-medium text-foreground">{time}</dd>
      </div>
      {duration ? (
        <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
          <dt className="text-sm text-muted-foreground">Duration</dt>
          <dd className="font-medium text-foreground">{duration}</dd>
        </div>
      ) : null}
      {fee ? (
        <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
          <dt className="text-sm text-muted-foreground">Fitting fee</dt>
          <dd className="font-serif text-2xl text-brand-deep-lavender">{fee}</dd>
        </div>
      ) : null}
    </dl>
  )
}
