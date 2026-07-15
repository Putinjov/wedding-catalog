'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'

import type { ManualAppointmentDress } from '@/lib/admin/appointments/calendarTypes'
import { getBookingDateBounds, getConfiguredSlotTimes } from '@/lib/booking/date'
import { UNPAID_MANUAL_CONFIRMATION_WARNING } from '@/lib/admin/appointments/statusWarnings'

type CreateResponse = { message?: string }

export function NewAppointmentDialog({
  dresses,
  onCreated,
  onOpenChange,
  open,
}: {
  dresses: ManualAppointmentDress[]
  onCreated: () => Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const [purpose, setPurpose] = useState<'buy' | 'rent'>('buy')
  const [initialStatus, setInitialStatus] = useState<'pending' | 'confirmed'>('pending')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const bounds = getBookingDateBounds()
  const dressOptions = useMemo(
    () => dresses.filter((dress) => (purpose === 'buy' ? dress.forSale : dress.availableForRent)),
    [dresses, purpose],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
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
          time: String(data.get('time') ?? ''),
          customerName: String(data.get('customerName') ?? ''),
          email: String(data.get('email') ?? ''),
          phone: String(data.get('phone') ?? ''),
          notes: String(data.get('notes') ?? '') || undefined,
          initialStatus,
          allowUnpaidManualConfirmation,
        }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = (await response.json()) as CreateResponse
      if (!response.ok) throw new Error(body.message ?? 'Unable to create the appointment.')
      form.reset()
      setPurpose('buy')
      setInitialStatus('pending')
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
            <label><span>Purpose</span><select onChange={(event) => setPurpose(event.target.value as 'buy' | 'rent')} value={purpose}><option value="buy">Buy</option><option value="rent">Rent</option></select></label>
            <label><span>Dress (optional)</span><select name="dressId" defaultValue=""><option value="">No dress selected</option>{dressOptions.map((dress) => <option key={dress.id} value={dress.id}>{dress.name}</option>)}</select></label>
            <div className="new-appointment-form__row">
              <label><span>Date</span><input max={bounds.maxDate} min={bounds.minDate} name="date" required type="date" /></label>
              <label><span>Time</span><select name="time" required defaultValue=""><option disabled value="">Choose time</option>{getConfiguredSlotTimes().map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
            </div>
            <label><span>Customer name</span><input autoComplete="name" maxLength={120} minLength={2} name="customerName" required /></label>
            <label><span>Email</span><input autoComplete="email" name="email" required type="email" /></label>
            <label><span>Phone</span><input autoComplete="tel" maxLength={40} minLength={5} name="phone" required type="tel" /></label>
            <label><span>Notes</span><textarea maxLength={1000} name="notes" rows={4} /></label>
            <label><span>Initial status</span><select onChange={(event) => setInitialStatus(event.target.value as 'pending' | 'confirmed')} value={initialStatus}><option value="pending">Pending</option><option value="confirmed">Confirmed — unpaid manual booking</option></select></label>
            {initialStatus === 'confirmed' ? <p className="calendar-warning">{UNPAID_MANUAL_CONFIRMATION_WARNING}</p> : null}
            <div className="new-appointment-form__actions"><Dialog.Close asChild><button className="calendar-button" type="button">Cancel</button></Dialog.Close><button className="calendar-button calendar-button--primary" disabled={busy} type="submit">{busy ? 'Creating…' : 'Create appointment'}</button></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
