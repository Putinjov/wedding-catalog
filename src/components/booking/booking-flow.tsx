'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import { BookingProgress } from '@/components/booking/booking-progress'
import { BookingSummary } from '@/components/booking/booking-summary'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import { SelectedDressSummary } from '@/components/booking/selected-dress-summary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AvailableSlot, BookingPurpose, ResolvedBookingSettings } from '@/config/booking'
import { currentPrivacyPolicy } from '@/config/privacy'
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
import { getBookingNoticeLabel } from '@/lib/booking/noticeRules'
import { getAvailableBookingPurposes } from '@/lib/booking/purpose'
import {
  getBookingErrorsForStep,
  getBookingFieldStep,
  getBookingStepAnnouncement,
  getFirstBookingError,
  type BookingField,
  type BookingStep,
} from '@/lib/booking/focus'
import {
  bookingNotesMaxLength,
  bookingSchema,
  getBookingFieldErrors,
  type BookingFieldErrors,
  type BookingInput,
} from '@/lib/booking/validation'

import type { PurposeOption, SelectedDressSummary as SelectedDress } from './types'

export const purposeOptions: PurposeOption[] = [
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
  {
    description: 'Explore both options with guidance during your fitting.',
    label: 'I’m not sure yet',
    value: 'undecided',
  },
]

type AvailabilityState = {
  message?: string
  slots: AvailableSlot[]
  status: 'idle' | 'loading' | 'error' | 'ready'
}

type SubmitState = {
  status: 'idle' | 'submitting' | 'error'
}

function PrivacyPolicyText({ text }: { text: string }) {
  const [before, after = ''] = text.split('Privacy Policy')

  return (
    <>
      {before}
      <Link
        className="font-medium text-foreground underline underline-offset-4"
        href={currentPrivacyPolicy.policyPath}
      >
        Privacy Policy
      </Link>
      {after}
    </>
  )
}

export function BookingFlow({
  initialDate = '',
  initialPurpose,
  initialTime = '',
  maxDate,
  minDate,
  selectedDress: initialSelectedDress,
  settings,
  syncURLState = false,
}: {
  initialDate?: string
  initialPurpose: BookingPurpose
  initialTime?: string
  maxDate: string
  minDate: string
  selectedDress: SelectedDress | null
  settings: ResolvedBookingSettings
  syncURLState?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = useRef(0)
  const requestedInitialTime = useRef(initialTime)
  const fieldRefs = useRef<Partial<Record<BookingField, HTMLElement | null>>>({})
  const formErrorRef = useRef<HTMLParagraphElement>(null)
  const pendingFieldFocus = useRef<BookingField | null>(null)
  const pendingFormErrorFocus = useRef(false)
  const previousStep = useRef<BookingStep>(1)
  const stepHeadingRefs = useRef<Partial<Record<BookingStep, HTMLElement | null>>>({})
  const [step, setStep] = useState<BookingStep>(1)
  const [announcement, setAnnouncement] = useState(getBookingStepAnnouncement(1))
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
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false)
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' })
  const availablePurposes = getAvailableBookingPurposes(selectedDress)
  const bookingNoticeLabel = getBookingNoticeLabel(settings)

  const clearValidationState = useCallback(() => {
    setFieldErrors({})
    setFormError('')
    setSubmitState({ status: 'idle' })
  }, [])

  const clearFieldError = useCallback((field: BookingField) => {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors[field]
      return nextErrors
    })
    setFormError('')
    setSubmitState({ status: 'idle' })
  }, [])

  const focusField = useCallback((field: BookingField) => {
    const target = fieldRefs.current[field]
    if (target) {
      const focusTarget = target.hasAttribute('tabindex')
        ? target
        : target.matches('button, input, textarea, select')
          ? target
          : target.querySelector<HTMLElement>('button, input, textarea, select')
      focusTarget?.focus()
      return
    }

    stepHeadingRefs.current[getBookingFieldStep(field)]?.focus()
  }, [])

  useEffect(() => {
    const stepChanged = previousStep.current !== step
    if (stepChanged) {
      setAnnouncement(getBookingStepAnnouncement(step))
    }

    const fieldToFocus = pendingFieldFocus.current
    if (fieldToFocus) {
      pendingFieldFocus.current = null
      focusField(fieldToFocus)
    } else if (pendingFormErrorFocus.current && formErrorRef.current) {
      pendingFormErrorFocus.current = false
      formErrorRef.current.focus()
    } else if (stepChanged) {
      stepHeadingRefs.current[step]?.focus()
    }

    previousStep.current = step
  }, [fieldErrors, focusField, formError, step])

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
    clearFieldError('date')
    clearFieldError('time')
    if (!value) setAvailability({ slots: [], status: 'idle' })
  }

  function getCurrentFieldErrors(): BookingFieldErrors {
    const parsed = bookingSchema.safeParse({
      customerName,
      date,
      dressSlug: selectedDress?.slug,
      email,
      marketingEmailOptIn,
      notes: notes || undefined,
      phone,
      privacyAcknowledged,
      purpose,
      time: selectedSlot ? formatTimeInputValue(selectedSlot.startAt) : '',
    })

    return parsed.success ? {} : getBookingFieldErrors(parsed.error)
  }

  function showFieldErrors(
    errors: BookingFieldErrors,
    message: string,
    status: SubmitState['status'] = 'idle',
  ) {
    const firstError = getFirstBookingError(errors)
    setFieldErrors(errors)
    setFormError(
      status === 'idle' && firstError ? (errors[firstError] ?? message) : message,
    )
    setSubmitState({ status })

    if (firstError) {
      pendingFieldFocus.current = firstError
      setStep(getBookingFieldStep(firstError))
      return
    }

    pendingFormErrorFocus.current = true
  }

  function handleNext() {
    if (step === 1) {
      if (!availablePurposes.includes(purpose)) {
        showFieldErrors(
          { purpose: 'Please choose an available fitting purpose.' },
          'Please check the highlighted details.',
        )
        return
      }
      clearValidationState()
      setStep(2)
      return
    }

    if (step === 2) {
      const errors = getBookingErrorsForStep(getCurrentFieldErrors(), 2)
      if (getFirstBookingError(errors)) {
        showFieldErrors(errors, 'Please check the highlighted details.')
        return
      }
      clearValidationState()
      setStep(3)
      return
    }

    if (step === 3) {
      const errors = getBookingErrorsForStep(getCurrentFieldErrors(), 3)
      if (getFirstBookingError(errors)) {
        showFieldErrors(errors, 'Please check the highlighted details.')
        return
      }
      clearValidationState()
      setStep(4)
    }
  }

  function handleBack() {
    clearValidationState()
    setStep((currentStep) => (currentStep > 1 ? ((currentStep - 1) as BookingStep) : 1))
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
      privacyAcknowledged,
      marketingEmailOptIn,
      purpose,
      time: formatTimeInputValue(selectedSlot.startAt),
    })

    if (result.success) {
      router.push(`/book-a-fitting/pending/${encodeURIComponent(result.reference)}`)
      return
    }

    showFieldErrors(result.fieldErrors ?? {}, result.message, 'error')
  }

  function getFieldError(field: keyof BookingInput): string | undefined {
    return fieldErrors[field]
  }

  const summaryDate = date ? formatDateForCustomer(date) : 'Not selected'
  const summaryTime = selectedSlot?.label ?? 'Not selected'

  return (
    <form
      aria-busy={submitState.status === 'submitting'}
      autoComplete="on"
      className="border border-brand-warm-border bg-brand-blush/25 p-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:p-8 sm:pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:p-10 md:pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-10"
      noValidate
      onSubmit={handleSubmit}
    >
      <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
      <BookingProgress currentStep={step} />

      {selectedDress ? (
        <>
          <SelectedDressSummary
            dress={selectedDress}
            onRemove={() => {
              setSelectedDress(null)
              clearFieldError('dressSlug')
              clearFieldError('purpose')
            }}
            removeButtonDescriptionID={
              getFieldError('dressSlug') ? 'selected-dress-error' : undefined
            }
            removeButtonRef={(node) => {
              fieldRefs.current.dressSlug = node
            }}
          />
          {getFieldError('dressSlug') ? (
            <p className="mt-2 text-sm text-destructive" id="selected-dress-error">
              {getFieldError('dressSlug')}
            </p>
          ) : null}
        </>
      ) : null}

      {step === 1 ? (
        <fieldset
          aria-describedby={getFieldError('purpose') ? 'booking-purpose-error' : undefined}
          aria-invalid={Boolean(getFieldError('purpose'))}
          className="mt-10 outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2"
          ref={(node) => {
            fieldRefs.current.purpose = node
          }}
          tabIndex={-1}
        >
          <legend
            className="font-serif text-3xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2"
            ref={(node) => {
              stepHeadingRefs.current[1] = node
            }}
            tabIndex={-1}
          >
            What brings you in?{' '}
            <span className="font-sans text-sm font-normal text-muted-foreground">
              (required)
            </span>
          </legend>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Choose whether this private appointment is for buying, renting, or deciding with our
            guidance.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-3" role="group">
            {purposeOptions
              .filter((option) => availablePurposes.includes(option.value))
              .map((option) => (
                <button
                  aria-pressed={purpose === option.value}
                  className="group flex min-h-36 flex-col items-start justify-between border border-brand-warm-border bg-background p-5 text-left outline-none transition-colors hover:border-brand-deep-lavender focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2 data-[selected=true]:border-brand-deep-lavender data-[selected=true]:bg-brand-soft-lavender/55"
                  data-selected={purpose === option.value}
                  key={option.value}
                  onClick={() => {
                    setPurpose(option.value)
                    clearFieldError('purpose')
                  }}
                  type="button"
                >
                  <span className="text-xs uppercase tracking-[0.22em] text-brand-deep-lavender group-data-[selected=true]:text-foreground">
                    {option.label}
                  </span>
                  <span>
                    <span className="block font-serif text-2xl text-foreground">{option.label}</span>
                    <span className="mt-2 block text-sm leading-6 text-muted-foreground group-data-[selected=true]:text-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              ))}
          </div>
          {getFieldError('purpose') ? (
            <p className="mt-3 text-sm text-destructive" id="booking-purpose-error">
              {getFieldError('purpose')}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {step === 2 ? (
        <section aria-labelledby="date-time-heading" className="mt-10">
          <h2
            className="font-serif text-3xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2"
            id="date-time-heading"
            ref={(node) => {
              stepHeadingRefs.current[2] = node
            }}
            tabIndex={-1}
          >
            Choose a date and time
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Fittings last {settings.durationMinutes} minutes. Choose a date first and we will
            show the currently available times.
          </p>
          <div className="mt-7 min-w-0">
            <p className="text-sm font-medium text-foreground" id="fitting-date-label">
              Preferred date <span className="font-normal text-muted-foreground">(required)</span>
            </p>
            <div
              aria-describedby={`fitting-date-help${getFieldError('date') ? ' fitting-date-error' : ''}`}
              aria-labelledby="fitting-date-label"
              className="mt-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2"
              ref={(node) => {
                fieldRefs.current.date = node
              }}
              role="group"
              tabIndex={-1}
            >
              <BookingCalendar
                fullyBookedDates={fullyBookedDates}
                maxDate={maxDate}
                minDate={minDate}
                onSelect={handleDateChange}
                selectedDate={date}
                settings={settings}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground" id="fitting-date-help">
              {getBookingWindowLabel(settings)} {getBookingScheduleLabel(settings)}
              {bookingNoticeLabel ? ` ${bookingNoticeLabel}` : ''}
            </p>
            {getFieldError('date') ? (
              <p className="mt-2 text-sm text-destructive" id="fitting-date-error">
                {getFieldError('date')}
              </p>
            ) : null}
            {calendarAvailabilityError ? (
              <p className="mt-2 text-sm text-muted-foreground" role="status">
                {calendarAvailabilityError}
              </p>
            ) : null}
          </div>

          <div
            aria-busy={availability.status === 'loading'}
            aria-describedby={`fitting-time-required${getFieldError('time') ? ' fitting-time-error' : ''}`}
            aria-label="Fitting time"
            aria-live="polite"
            className="mt-8 outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2"
            ref={(node) => {
              fieldRefs.current.time = node
            }}
            role="group"
            tabIndex={-1}
          >
            <span className="sr-only" id="fitting-time-required">
              Fitting time selection is required.
            </span>
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
                <p className="text-sm font-medium text-foreground" id="fitting-time-label">
                  Available times{' '}
                  <span className="font-normal text-muted-foreground">(required)</span>
                </p>
                <div
                  aria-labelledby="fitting-time-label"
                  className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"
                  role="group"
                >
                  {availability.slots.map((slot) => (
                    <button
                      aria-pressed={selectedSlot?.startAt === slot.startAt}
                      className="border border-brand-warm-border bg-background px-4 py-3 text-sm outline-none transition-colors hover:border-brand-deep-lavender focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2 data-[selected=true]:border-brand-deep-lavender data-[selected=true]:bg-brand-deep-lavender data-[selected=true]:text-white"
                      data-selected={selectedSlot?.startAt === slot.startAt}
                      key={slot.startAt}
                      onClick={() => {
                        setSelectedSlot(slot)
                        clearFieldError('time')
                      }}
                      type="button"
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {getFieldError('time') ? (
              <p className="mt-2 text-sm text-destructive" id="fitting-time-error">
                {getFieldError('time')}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section aria-labelledby="customer-details-heading" className="mt-10">
          <h2
            className="font-serif text-3xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2"
            id="customer-details-heading"
            ref={(node) => {
              stepHeadingRefs.current[3] = node
            }}
            tabIndex={-1}
          >
            Your details
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We will use these details to prepare your private fitting request.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Fields marked required must be completed. Notes and marketing emails are optional.
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
            <div
              className="sm:col-span-2"
              ref={(node) => {
                fieldRefs.current.customerName = node
              }}
            >
              <div className="flex items-baseline gap-1 text-sm">
                <label className="font-medium text-foreground" htmlFor="customer-name">
                  Name
                </label>
                <span aria-hidden="true" className="font-normal text-muted-foreground">
                  (required)
                </span>
              </div>
              <Input
                aria-describedby={getFieldError('customerName') ? 'customer-name-error' : undefined}
                aria-invalid={Boolean(getFieldError('customerName'))}
                autoComplete="name"
                className="mt-2 min-h-11 scroll-mb-[calc(7.5rem+env(safe-area-inset-bottom))] rounded-sm bg-background lg:scroll-mb-0"
                id="customer-name"
                name="name"
                onChange={(event) => {
                  setCustomerName(event.target.value)
                  clearFieldError('customerName')
                }}
                required
                value={customerName}
              />
              {getFieldError('customerName') ? (
                <p className="mt-2 text-sm text-destructive" id="customer-name-error">
                  {getFieldError('customerName')}
                </p>
              ) : null}
            </div>
            <div
              ref={(node) => {
                fieldRefs.current.email = node
              }}
            >
              <div className="flex items-baseline gap-1 text-sm">
                <label className="font-medium text-foreground" htmlFor="customer-email">
                  Email
                </label>
                <span aria-hidden="true" className="font-normal text-muted-foreground">
                  (required)
                </span>
              </div>
              <Input
                aria-describedby={getFieldError('email') ? 'customer-email-error' : undefined}
                aria-invalid={Boolean(getFieldError('email'))}
                autoComplete="email"
                className="mt-2 min-h-11 scroll-mb-[calc(7.5rem+env(safe-area-inset-bottom))] rounded-sm bg-background lg:scroll-mb-0"
                id="customer-email"
                inputMode="email"
                name="email"
                onChange={(event) => {
                  setEmail(event.target.value)
                  clearFieldError('email')
                }}
                required
                type="email"
                value={email}
              />
              {getFieldError('email') ? (
                <p className="mt-2 text-sm text-destructive" id="customer-email-error">
                  {getFieldError('email')}
                </p>
              ) : null}
            </div>
            <div
              ref={(node) => {
                fieldRefs.current.phone = node
              }}
            >
              <div className="flex items-baseline gap-1 text-sm">
                <label className="font-medium text-foreground" htmlFor="customer-phone">
                  Phone
                </label>
                <span aria-hidden="true" className="font-normal text-muted-foreground">
                  (required)
                </span>
              </div>
              <Input
                aria-describedby={getFieldError('phone') ? 'customer-phone-error' : undefined}
                aria-invalid={Boolean(getFieldError('phone'))}
                autoComplete="tel"
                className="mt-2 min-h-11 scroll-mb-[calc(7.5rem+env(safe-area-inset-bottom))] rounded-sm bg-background lg:scroll-mb-0"
                id="customer-phone"
                inputMode="tel"
                name="tel"
                onChange={(event) => {
                  setPhone(event.target.value)
                  clearFieldError('phone')
                }}
                required
                type="tel"
                value={phone}
              />
              {getFieldError('phone') ? (
                <p className="mt-2 text-sm text-destructive" id="customer-phone-error">
                  {getFieldError('phone')}
                </p>
              ) : null}
            </div>
            <div
              className="sm:col-span-2"
              ref={(node) => {
                fieldRefs.current.notes = node
              }}
            >
              <label className="text-sm font-medium text-foreground" htmlFor="customer-notes">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                aria-describedby={`customer-notes-help customer-notes-count${getFieldError('notes') ? ' customer-notes-error' : ''}`}
                aria-invalid={Boolean(getFieldError('notes'))}
                className="mt-2 scroll-mb-[calc(7.5rem+env(safe-area-inset-bottom))] rounded-sm bg-background lg:scroll-mb-0"
                id="customer-notes"
                maxLength={bookingNotesMaxLength}
                name="notes"
                onChange={(event) => {
                  setNotes(event.target.value)
                  clearFieldError('notes')
                }}
                rows={4}
                value={notes}
              />
              {getFieldError('notes') ? (
                <p className="mt-2 text-sm text-destructive" id="customer-notes-error">
                  {getFieldError('notes')}
                </p>
              ) : null}
              <div className="mt-2 flex flex-col gap-1 text-xs leading-5 text-muted-foreground sm:flex-row sm:justify-between sm:gap-4">
                <p id="customer-notes-help">
                  Please do not include medical or other sensitive personal information.
                </p>
                <p
                  aria-atomic="true"
                  aria-live="polite"
                  className="shrink-0"
                  id="customer-notes-count"
                  role="status"
                >
                  {notes.length} of {bookingNotesMaxLength} characters used
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-brand-warm-border pt-6">
            <p className="text-sm leading-6 text-muted-foreground" id="booking-privacy-notice">
              <PrivacyPolicyText text={currentPrivacyPolicy.noticeText} />
            </p>
            <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-foreground">
              <input
                aria-describedby={`booking-privacy-notice${getFieldError('privacyAcknowledged') ? ' privacy-acknowledgement-error' : ''}`}
                aria-invalid={Boolean(getFieldError('privacyAcknowledged'))}
                checked={privacyAcknowledged}
                className="mt-1 size-5 shrink-0 accent-foreground"
                name="privacyAcknowledged"
                onChange={(event) => {
                  setPrivacyAcknowledged(event.target.checked)
                  clearFieldError('privacyAcknowledged')
                }}
                ref={(node) => {
                  fieldRefs.current.privacyAcknowledged = node
                }}
                required
                type="checkbox"
              />
              <span>
                <PrivacyPolicyText text={currentPrivacyPolicy.acknowledgementText} />{' '}
                <span className="text-muted-foreground">(required)</span>
              </span>
            </label>
            {getFieldError('privacyAcknowledged') ? (
              <p className="mt-2 text-sm text-destructive" id="privacy-acknowledgement-error">
                {getFieldError('privacyAcknowledged')}
              </p>
            ) : null}
            <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-foreground">
              <input
                aria-describedby={
                  getFieldError('marketingEmailOptIn') ? 'marketing-email-error' : undefined
                }
                aria-invalid={Boolean(getFieldError('marketingEmailOptIn'))}
                checked={marketingEmailOptIn}
                className="mt-1 size-5 shrink-0 accent-foreground"
                name="marketingEmailOptIn"
                onChange={(event) => {
                  setMarketingEmailOptIn(event.target.checked)
                  clearFieldError('marketingEmailOptIn')
                }}
                ref={(node) => {
                  fieldRefs.current.marketingEmailOptIn = node
                }}
                type="checkbox"
              />
              <span>
                {currentPrivacyPolicy.marketingEmailOptInText}{' '}
                <span className="text-muted-foreground">(optional)</span>
              </span>
            </label>
            {getFieldError('marketingEmailOptIn') ? (
              <p className="mt-2 text-sm text-destructive" id="marketing-email-error">
                {getFieldError('marketingEmailOptIn')}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section aria-labelledby="booking-review-heading" className="mt-10">
          <h2
            className="font-serif text-3xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-deep-lavender focus-visible:ring-offset-2"
            id="booking-review-heading"
            ref={(node) => {
              stepHeadingRefs.current[4] = node
            }}
            tabIndex={-1}
          >
            Review your request
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Check the details below before creating your pending appointment request.
          </p>
          <div className="mt-7">
            <BookingSummary
              date={summaryDate}
              dressName={selectedDress?.name}
              duration={`${settings.durationMinutes} minutes`}
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

      {formError ? (
        <p
          className="mt-6 text-sm text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
          ref={formErrorRef}
          role="alert"
          tabIndex={-1}
        >
          {formError}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-brand-warm-border bg-background/95 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3 shadow-[0_-8px_24px_rgba(44,38,33,0.12)] backdrop-blur lg:static lg:mt-8 lg:flex lg:items-center lg:justify-between lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-6 lg:shadow-none lg:backdrop-blur-none">
        {step > 1 ? (
          <Button className="min-h-11 rounded-sm" onClick={handleBack} type="button" variant="outline">
            Back
          </Button>
        ) : null}
        {step < 4 ? (
          <Button
            className={`${step === 1 ? 'col-span-2' : ''} w-full rounded-sm lg:ml-auto lg:w-auto`}
            key={`continue-step-${step}`}
            onClick={handleNext}
            size="lg"
            type="button"
          >
            Continue to {step === 1 ? 'date and time' : step === 2 ? 'your details' : 'review'}
          </Button>
        ) : (
          <Button
            className="w-full rounded-sm lg:ml-auto lg:w-auto"
            disabled={submitState.status === 'submitting'}
            key="submit-booking"
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
