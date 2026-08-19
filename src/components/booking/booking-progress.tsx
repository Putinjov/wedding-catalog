import { bookingSteps, type BookingStep } from '@/lib/booking/focus'

export function BookingProgress({ currentStep }: { currentStep: BookingStep }) {
  return (
    <ol aria-label="Booking progress" className="grid grid-cols-4 gap-2">
      {bookingSteps.map(({ label, step }) => {
        const isCurrent = step === currentStep
        const isComplete = step < currentStep

        return (
          <li
            aria-current={isCurrent ? 'step' : undefined}
            className="flex min-w-0 flex-col gap-2 text-xs uppercase tracking-[0.16em]"
            key={label}
          >
            <span
              className={`h-1 ${isComplete || isCurrent ? 'bg-brand-deep-lavender' : 'bg-brand-warm-border'}`}
            />
            <span className={isCurrent ? 'font-semibold text-brand-deep-lavender' : 'text-muted-foreground'}>
              {step}. {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
