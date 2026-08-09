'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import Link from 'next/link'
import { type FormEvent, useMemo, useState } from 'react'

import {
  bookingPurposeValues,
  type BookingPurpose,
  type ResolvedBookingSettings,
} from '@/config/booking'
import type { ManualAppointmentDress } from '@/lib/admin/appointments/calendarTypes'
import { UNPAID_MANUAL_CONFIRMATION_WARNING } from '@/lib/admin/appointments/statusWarnings'
import { getBookingDateBounds } from '@/lib/booking/date'
import {
  ADMIN_NOTICE_OVERRIDE_WARNING,
  getNoticeEligibleSlotTimes,
} from '@/lib/booking/noticeRules'
import { getBookingPurposeAdminLabel } from '@/lib/booking/purpose'
import { currentPrivacyPolicy } from '@/config/privacy'

type CreateResponse = { message?: string }

export function NewAppointmentDialog({
  dresses,
  onCreated,
  onOpenChange,
  open,
  settings,
}: {
  dresses: ManualAppointmentDress[]
  onCreated: () => Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  settings: ResolvedBookingSettings
}) {
  const [purpose, setPurpose] = useState<BookingPurpose>('buy')
  const [initialStatus, setInitialStatus] = useState<'pending_payment' | 'confirmed'>('pending_payment')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [overrideNoticeRules, setOverrideNoticeRules] = useState(false)
  const bounds = getBookingDateBounds(settings)
  const dressOptions = useMemo(
    () =>
      dresses.filter((dress) =>
        purpose === 'undecided' ||
        (purpose === 'buy' ? dress.availableForBuy : dress.availableForRent),
      ),
    [dresses, purpose],
  )
  const slotTimes = useMemo(
    () =>
      date
        ? getNoticeEligibleSlotTimes({
            allowNoticeOverride: overrideNoticeRules,
            dateKey: date,
            settings,
          })
        : [],
    [date, overrideNoticeRules, settings],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (overrideNoticeRules && !window.confirm(ADMIN_NOTICE_OVERRIDE_WARNING)) return
    let allowUnpaidManualConfirmation = false
    if (initialStatus === 'confirmed') {
      if (!window.confirm(UNPAID_MANUAL_CONFIRMATION_WARNING)) return
      allowUnpaidManualConfirmation = true
    }

    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/appointments/calendar/create', {
        body: JSON.stringify({
          purpose,
          dressId: String(data.get('dressId') ?? '') || undefined,
          date: String(data.get('date') ?? ''),
          time,
          customerName: String(data.get('customerName') ?? ''),
          email: String(data.get('email') ?? ''),
          phone: String(data.get('phone') ?? ''),
          notes: String(data.get('notes') ?? '') || undefined,
          privacyNoticeMethod: String(data.get('privacyNoticeMethod') ?? ''),
          initialStatus,
          allowUnpaidManualConfirmation,
          overrideNoticeRules,
        }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = (await response.json()) as CreateResponse
      if (!response.ok) throw new Error(body.message ?? 'Unable to create the appointment.')
      form.reset()
      setPurpose('buy')
      setInitialStatus('pending_payment')
      setDate('')
      setTime('')
      setOverrideNoticeRules(false)
      onOpenChange(false)
      await onCreated()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create the appointment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="calendar-dialog__overlay" />
        <Dialog.Content className="new-appointment-dialog">
          <Dialog.Title>New appointment</Dialog.Title>
          <Dialog.Description>Create a manual booking in an available configured fitting slot.</Dialog.Description>
          <Dialog.Close className="calendar-dialog__close" aria-label="Close new appointment"><X /></Dialog.Close>
          {error ? <p className="calendar-message calendar-message--error" role="alert">{error}</p> : null}
          <form className="new-appointment-form" onSubmit={submit}>
            <label><span>Purpose</span><select onChange={(event) => setPurpose(event.target.value as BookingPurpose)} value={purpose}>{bookingPurposeValues.map((value) => <option key={value} value={value}>{getBookingPurposeAdminLabel(value)}</option>)}</select></label>
            <label><span>Dress (optional)</span><select name="dressId" defaultValue=""><option value="">No dress selected</option>{dressOptions.map((dress) => <option key={dress.id} value={dress.id}>{dress.name}</option>)}</select></label>
            <div className="new-appointment-form__row">
              <label><span>Date</span><input max={bounds.maxDate} min={bounds.minDate} name="date" onChange={(event) => { setDate(event.target.value); setTime('') }} required type="date" value={date} /></label>
              <label><span>Time</span><select name="time" onChange={(event) => setTime(event.target.value)} required value={time}><option disabled value="">Choose time</option>{slotTimes.map((slotTime) => <option key={slotTime} value={slotTime}>{slotTime}</option>)}</select></label>
            </div>
            <label className="new-appointment-form__override"><input checked={overrideNoticeRules} onChange={(event) => { setOverrideNoticeRules(event.target.checked); setTime('') }} type="checkbox" /><span>Override minimum notice and next-day cutoff</span></label>
            {overrideNoticeRules ? <p className="calendar-warning">{ADMIN_NOTICE_OVERRIDE_WARNING}</p> : null}
            <label><span>Customer name</span><input autoComplete="name" maxLength={120} minLength={2} name="customerName" required /></label>
            <label><span>Email</span><input autoComplete="email" name="email" required type="email" /></label>
            <label><span>Phone</span><input autoComplete="tel" maxLength={40} minLength={5} name="phone" required type="tel" /></label>
            <label><span>Notes</span><textarea maxLength={1000} name="notes" rows={4} /></label>
            <div className="new-appointment-form__privacy">
              <p>
                Provide the current privacy notice before creating this booking. Do not record an
                acknowledgement or marketing opt-in on the customer&apos;s behalf.{' '}
                <Link href={currentPrivacyPolicy.policyPath} target="_blank">
                  Open Privacy Policy
                </Link>
              </p>
              <p>{currentPrivacyPolicy.noticeText}</p>
            </div>
            <label>
              <span>Privacy notice provided by</span>
              <select defaultValue="" name="privacyNoticeMethod" required>
                <option disabled value="">Choose method</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="in_person">In person</option>
              </select>
            </label>
            <label><span>Initial status</span><select onChange={(event) => setInitialStatus(event.target.value as 'pending_payment' | 'confirmed')} value={initialStatus}><option value="pending_payment">Pending payment</option><option value="confirmed">Confirmed — unpaid manual booking</option></select></label>
            {initialStatus === 'confirmed' ? <p className="calendar-warning">{UNPAID_MANUAL_CONFIRMATION_WARNING}</p> : null}
            <div className="new-appointment-form__actions"><Dialog.Close asChild><button className="calendar-button" type="button">Cancel</button></Dialog.Close><button className="calendar-button calendar-button--primary" disabled={busy} type="submit">{busy ? 'Creating…' : 'Create appointment'}</button></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
