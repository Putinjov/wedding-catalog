'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useRef, useState } from 'react'

import { BookingProgress } from '@/components/booking/booking-progress'
import { BookingSummary } from '@/components/booking/booking-summary'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import { SelectedDressSummary } from '@/components/booking/selected-dress-summary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { bookingConfig, type AvailableSlot, type BookingPurpose } from '@/config/booking'
import { formatFittingFee } from '@/config/site'
import {
  getBookingScheduleLabel,
  getBookingWindowLabel,
  formatDateForCustomer,
  formatTimeInputValue,
} from '@/lib/booking/date'
import { createPendingAppointment, type BookingActionResult } from '@/lib/booking/createAppointment'
import { getAvailableSlots } from '@/lib/booking/getAvailableSlots'
import { getFullyBookedDates } from '@/lib/booking/getFullyBookedDates'
import type { BookingFieldErrors, BookingInput } from '@/lib/booking/validation'

import type { PurposeOption, SelectedDressSummary as SelectedDress } from './types'

const purposeOptions: PurposeOption[] = [
  {
    description: 'Explore dresses available to purchase.',
    label: 'Buy',
    value: 'buy',
  },
  {
    description: 'Explore dresses available to rent.',
    label: 'Rent',
    value: 'rent',
  },
]

type AvailabilityState = {
  message?: string
  slots: AvailableSlot[]
  status: 'idle' | 'loading' | 'error' | 'ready'
}

type SubmitState = {
  fieldErrors?: BookingFieldErrors
  message?: string
  status: 'idle' | 'submitting' | 'error'
}

function getAvailablePurposeValues(dress: SelectedDress | null): BookingPurpose[] {
  if (!dress) {
    return purposeOptions.map((option) => option.value)
  }

  return purposeOptions
    .map((option) => option.value)
    .filter((purpose) => (purpose === 'buy' ? dress.supportsBuy : dress.supportsRent))
}

export function BookingFlow({
  initialDate = '',
  initialPurpose,
  initialTime = '',
  maxDate,
  minDate,
  selectedDress: initialSelectedDress,
  syncURLState = false,
}: {
  initialDate?: string
  initialPurpose: BookingPurpose
  initialTime?: string
  maxDate: string
  minDate: string
  selectedDress: SelectedDress | null
  syncURLState?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = useRef(0)
  const requestedInitialTime = useRef(initialTime)
  const [step, setStep] = useState(1)
  const [purpose, setPurpose] = useState(initialPurpose)
  const [selectedDress, setSelectedDress] = useState<SelectedDress | null>(
    initialSelectedDress,
  )
  const [date, setDate] = useState(initialDate)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [availability, setAvailability] = useState<AvailabilityState>({
    slots: [],
    status: 'idle',
  })
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([])
  const [calendarAvailabilityError, setCalendarAvailabilityError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [stepError, setStepError] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' })
  const availablePurposes = getAvailablePurposeValues(selectedDress)

  useEffect(() => {
    void getFullyBookedDates()
      .then((result) => {
        if (result.success) {
          setFullyBookedDates(result.dates)
        } else {
          setCalendarAvailabilityError(result.message)
        }
      })
      .catch(() => {
        setCalendarAvailabilityError('Fully booked dates could not be preloaded. Times are still checked after selection.')
      })
  }, [])

  useEffect(() => {
    requestId.current += 1
    if (!date) return

    const currentRequestId = requestId.current
    void Promise.resolve()
      .then(() => {
        if (currentRequestId === requestId.current) {
          setAvailability({ slots: [], status: 'loading' })
        }
        return getAvailableSlots(date)
      })
      .then((result) => {
        if (currentRequestId !== requestId.current) {
          return
        }

        if (result.success) {
          setAvailability({ slots: result.slots, status: 'ready' })
          const requestedTime = requestedInitialTime.current
          if (requestedTime) {
            const matchingSlot = result.slots.find(
              (slot) => formatTimeInputValue(slot.startAt) === requestedTime,
            )
            if (matchingSlot) setSelectedSlot(matchingSlot)
            requestedInitialTime.current = ''
          }
        } else {
          setAvailability({ message: result.message, slots: [], status: 'error' })
        }
      })
      .catch(() => {
        if (currentRequestId === requestId.current) {
          setAvailability({
            message: 'We could not load fitting times. Please try again.',
            slots: [],
            status: 'error',
          })
        }
      })
  }, [date])

  useEffect(() => {
    if (!syncURLState) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('purpose', purpose)
    if (selectedDress) params.set('dress', selectedDress.slug)
    else params.delete('dress')
    if (date) params.set('date', date)
    else params.delete('date')
    if (selectedSlot) params.set('time', formatTimeInputValue(selectedSlot.startAt))
    else params.delete('time')

    const nextURL = params.size > 0 ? `${pathname}?${params.toString()}` : pathname
    const currentURL = searchParams.size > 0 ? `${pathname}?${searchParams.toString()}` : pathname
    if (nextURL !== currentURL) router.replace(nextURL, { scroll: false })
  }, [date, pathname, purpose, router, searchParams, selectedDress, selectedSlot, syncURLState])

  function handleDateChange(value: string) {
    requestedInitialTime.current = ''
    setDate(value)
    setSelectedSlot(null)
    setStepError('')
    if (!value) setAvailability({ slots: [], status: 'idle' })
  }

  function handleNext() {
    setStepError('')

    if (step === 1) {
      if (!availablePurposes.includes(purpose)) {
        setStepError('Please choose an available fitting purpose.')
        return
      }
      setStep(2)
      return
    }

    if (step === 2) {
      if (!date) {
        setStepError('Please choose a date.')
        return
      }
      if (!selectedSlot) {
        setStepError('Please choose an available time.')
        return
      }
      setStep(3)
      return
    }

    if (step === 3) {
      if (customerName.trim().length < 2) {
        setStepError('Please enter your name.')
        return
      }
      if (!email.trim()) {
        setStepError('Please enter your email address.')
        return
      }
      if (phone.trim().length < 7) {
        setStepError('Please enter a phone number so we can reach you.')
        return
      }
      setStep(4)
    }
  }

  function handleBack() {
    setStepError('')
    setSubmitState({ status: 'idle' })
    setStep((currentStep) => Math.max(1, currentStep - 1))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step !== 4 || !date || !selectedSlot) {
      return
    }

    setSubmitState({ status: 'submitting' })
    const result: BookingActionResult = await createPendingAppointment({
      customerName,
      date,
      dressSlug: selectedDress?.slug,
      email,
      notes: notes || undefined,
      phone,
      purpose,
      time: formatTimeInputValue(selectedSlot.startAt),
    })

    if (result.success) {
      router.push(`/book-a-fitting/pending/${encodeURIComponent(result.reference)}`)
      return
    }

    setSubmitState({
      fieldErrors: result.fieldErrors,
      message: result.message,
      status: 'error',
    })
    if (result.fieldErrors?.date || result.fieldErrors?.time) {
      setStep(2)
    } else if (
      result.fieldErrors?.customerName ||
      result.fieldErrors?.email ||
      result.fieldErrors?.phone ||
      result.fieldErrors?.notes
    ) {
      setStep(3)
    }
  }

  function getFieldError(field: keyof BookingInput): string | undefined {
    return submitState.status === 'error' ? submitState.fieldErrors?.[field] : undefined
  }

  const summaryDate = date ? formatDateForCustomer(date) : 'Not selected'
  const summaryTime = selectedSlot?.label ?? 'Not selected'

  return (
    <form className="border border-brand-warm-border bg-brand-blush/25 p-5 sm:p-8 md:p-10" noValidate onSubmit={handleSubmit}>
      <BookingProgress currentStep={step} />

      {selectedDress ? (
        <SelectedDressSummary dress={selectedDress} onRemove={() => setSelectedDress(null)} />
      ) : null}

      {step === 1 ? (
        <fieldset className="mt-10" aria-describedby={stepError ? 'booking-step-error' : undefined}>
          <legend className="font-serif text-3xl text-foreground">What brings you in?</legend>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Choose whether this private appointment is for buying or renting a dress.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2" role="group">
            {purposeOptions
              .filter((option) => availablePurposes.includes(option.value))
              .map((option) => (
                <button
                  aria-pressed={purpose === option.value}
                  className="flex min-h-36 flex-col items-start justify-between border border-brand-warm-border bg-background p-5 text-left outline-none transition-colors hover:border-brand-deep-lavender focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2 data-[selected=true]:border-brand-deep-lavender data-[selected=true]:bg-brand-soft-lavender/55"
                  data-selected={purpose === option.value}
                  key={option.value}
                  onClick={() => setPurpose(option.value)}
                  type="button"
                >
                  <span className="text-xs uppercase tracking-[0.22em] text-brand-deep-lavender">
                    {option.label}
                  </span>
                  <span>
                    <span className="block font-serif text-2xl text-foreground">{option.label}</span>
                    <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <section aria-labelledby="date-time-heading" className="mt-10">
          <h2 className="font-serif text-3xl text-foreground" id="date-time-heading">
            Choose a date and time
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Fittings last {bookingConfig.durationMinutes} minutes. Choose a date first and we will
            show the currently available times.
          </p>
          <div className="mt-7 min-w-0">
            <p className="text-sm font-medium text-foreground" id="fitting-date-label">
              Preferred date
            </p>
            <div aria-labelledby="fitting-date-label" className="mt-2">
              <BookingCalendar
                fullyBookedDates={fullyBookedDates}
                maxDate={maxDate}
                minDate={minDate}
                onSelect={handleDateChange}
                selectedDate={date}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground" id="fitting-date-help">
              {getBookingWindowLabel()} {getBookingScheduleLabel()}
            </p>
            {calendarAvailabilityError ? (
              <p className="mt-2 text-sm text-muted-foreground" role="status">
                {calendarAvailabilityError}
              </p>
            ) : null}
          </div>

          <div aria-live="polite" className="mt-8">
            {availability.status === 'loading' ? (
              <p className="text-sm text-muted-foreground">Checking available times…</p>
            ) : null}
            {availability.status === 'error' ? (
              <p className="text-sm text-destructive" role="alert">
                {availability.message}
              </p>
            ) : null}
            {availability.status === 'ready' && availability.slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No fitting times are available on this date. Please choose another date.
              </p>
            ) : null}
            {availability.slots.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-foreground">Available times</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group">
                  {availability.slots.map((slot) => (
                    <button
                      aria-pressed={selectedSlot?.startAt === slot.startAt}
                      className="border border-brand-warm-border bg-background px-4 py-3 text-sm outline-none transition-colors hover:border-brand-deep-lavender focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2 data-[selected=true]:border-brand-deep-lavender data-[selected=true]:bg-brand-deep-lavender data-[selected=true]:text-white"
                      data-selected={selectedSlot?.startAt === slot.startAt}
                      key={slot.startAt}
                      onClick={() => {
                        setSelectedSlot(slot)
                        setStepError('')
                        setSubmitState({ status: 'idle' })
                      }}
                      type="button"
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section aria-labelledby="customer-details-heading" className="mt-10">
          <h2 className="font-serif text-3xl text-foreground" id="customer-details-heading">
            Your details
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We will use these details to prepare your private fitting request.
          </p>
          <div className="mt-7">
            <BookingSummary
              date={summaryDate}
              dressName={selectedDress?.name}
              purpose={purpose}
              time={summaryTime}
            />
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="customer-name">
                Name
              </label>
              <Input
                aria-describedby={getFieldError('customerName') ? 'customer-name-error' : undefined}
                aria-invalid={Boolean(getFieldError('customerName'))}
                className="mt-2 rounded-sm bg-background"
                id="customer-name"
                onChange={(event) => setCustomerName(event.target.value)}
                value={customerName}
              />
              {getFieldError('customerName') ? (
                <p className="mt-2 text-sm text-destructive" id="customer-name-error">
                  {getFieldError('customerName')}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="customer-email">
                Email
              </label>
              <Input
                aria-describedby={getFieldError('email') ? 'customer-email-error' : undefined}
                aria-invalid={Boolean(getFieldError('email'))}
                className="mt-2 rounded-sm bg-background"
                id="customer-email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
              {getFieldError('email') ? (
                <p className="mt-2 text-sm text-destructive" id="customer-email-error">
                  {getFieldError('email')}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="customer-phone">
                Phone
              </label>
              <Input
                aria-describedby={getFieldError('phone') ? 'customer-phone-error' : undefined}
                aria-invalid={Boolean(getFieldError('phone'))}
                className="mt-2 rounded-sm bg-background"
                id="customer-phone"
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                value={phone}
              />
              {getFieldError('phone') ? (
                <p className="mt-2 text-sm text-destructive" id="customer-phone-error">
                  {getFieldError('phone')}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="customer-notes">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                aria-describedby={getFieldError('notes') ? 'customer-notes-error' : undefined}
                aria-invalid={Boolean(getFieldError('notes'))}
                className="mt-2 rounded-sm bg-background"
                id="customer-notes"
                maxLength={1000}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                value={notes}
              />
              {getFieldError('notes') ? (
                <p className="mt-2 text-sm text-destructive" id="customer-notes-error">
                  {getFieldError('notes')}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section aria-labelledby="booking-review-heading" className="mt-10">
          <h2 className="font-serif text-3xl text-foreground" id="booking-review-heading">
            Review your request
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Check the details below before creating your pending appointment request.
          </p>
          <div className="mt-7">
            <BookingSummary
              date={summaryDate}
              dressName={selectedDress?.name}
              duration={`${bookingConfig.durationMinutes} minutes`}
              fee={formatFittingFee()}
              purpose={purpose}
              time={summaryTime}
            />
          </div>
          <p className="mt-6 border-l-2 border-brand-antique-gold pl-4 text-sm leading-6 text-muted-foreground">
            Payment will be required to confirm this appointment.
          </p>
        </section>
      ) : null}

      {stepError ? (
        <p aria-live="polite" className="mt-6 text-sm text-destructive" id="booking-step-error" role="alert">
          {stepError}
        </p>
      ) : null}
      {submitState.status === 'error' && submitState.message ? (
        <p aria-live="polite" className="mt-6 text-sm text-destructive" role="alert">
          {submitState.message}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-brand-warm-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        {step > 1 ? (
          <Button className="rounded-sm" onClick={handleBack} type="button" variant="outline">
            Back
          </Button>
        ) : (
          <span />
        )}
        {step < 4 ? (
          <Button className="rounded-sm" onClick={handleNext} size="lg" type="button">
            Continue to {step === 1 ? 'date and time' : step === 2 ? 'your details' : 'review'}
          </Button>
        ) : (
          <Button
            className="rounded-sm"
            disabled={submitState.status === 'submitting'}
            size="lg"
            type="submit"
          >
            {submitState.status === 'submitting'
              ? 'Holding your appointment…'
              : 'Continue to payment'}
          </Button>
        )}
      </div>
    </form>
  )
}
