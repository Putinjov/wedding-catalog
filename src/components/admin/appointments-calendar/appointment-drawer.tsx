'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { ExternalLink, X } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import type { ResolvedBookingSettings } from '@/config/booking'
import type { AppointmentDetail, AppointmentStatus } from '@/lib/admin/appointments/calendarTypes'
import { formatDateTimeForCustomer, getBookingDateBounds } from '@/lib/booking/date'
import { getBookingPurposeAdminLabel } from '@/lib/booking/purpose'
import { getReopenedAppointmentStatus } from '@/lib/booking/appointmentLifecycle'
import {
  ADMIN_NOTICE_OVERRIDE_WARNING,
  getNoticeEligibleSlotTimes,
} from '@/lib/booking/noticeRules'
import {
  PAID_CANCELLATION_WARNING,
  PAID_REOPEN_WARNING,
  UNPAID_MANUAL_CONFIRMATION_WARNING,
} from '@/lib/admin/appointments/statusWarnings'

type DetailResponse = { appointment: AppointmentDetail; warning?: string | null; message?: string }
type DeliveryResponse = {
  delivery?: { event: string; id: number | string; status: string }
  message?: string
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IE', { currency, style: 'currency' }).format(amount)
}

export function AppointmentDrawer({
  appointmentId,
  onChanged,
  onClose,
  settings,
}: {
  appointmentId: string
  onChanged: () => Promise<void>
  onClose: () => void
  settings: ResolvedBookingSettings
}) {
  const [detail, setDetail] = useState<AppointmentDetail | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [overrideNoticeRules, setOverrideNoticeRules] = useState(false)
  const bounds = getBookingDateBounds(settings)
  const rescheduleTimes = useMemo(
    () =>
      rescheduleDate
        ? getNoticeEligibleSlotTimes({
            allowNoticeOverride: overrideNoticeRules,
            dateKey: rescheduleDate,
            settings,
          })
        : [],
    [overrideNoticeRules, rescheduleDate, settings],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/appointments/calendar/${appointmentId}`, { credentials: 'same-origin', signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as DetailResponse
        if (!response.ok) throw new Error(body.message ?? 'Unable to load appointment details.')
        setDetail(body.appointment)
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load appointment details.')
      })
    return () => controller.abort()
  }, [appointmentId])

  async function changeStatus(status: AppointmentStatus) {
    if (!detail) return
    const options: { acknowledgePaidCancellation?: boolean; acknowledgePaidReopen?: boolean; allowUnpaidManualConfirmation?: boolean } = {}
    if (status === 'cancelled' && detail.paymentStatus === 'paid') {
      if (!window.confirm(PAID_CANCELLATION_WARNING)) return
      options.acknowledgePaidCancellation = true
    }
    if (
      status === 'confirmed' &&
      detail.status === 'pending_payment' &&
      detail.paymentStatus === 'unpaid' &&
      detail.source === 'admin'
    ) {
      if (!window.confirm(UNPAID_MANUAL_CONFIRMATION_WARNING)) return
      options.allowUnpaidManualConfirmation = true
    }
    if (status === 'confirmed' && detail.status === 'cancelled' && detail.paymentStatus === 'paid') {
      if (!window.confirm(PAID_REOPEN_WARNING)) return
      options.acknowledgePaidReopen = true
    }

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/appointments/calendar/${appointmentId}/status`, {
        body: JSON.stringify({ status, ...options }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = (await response.json()) as DetailResponse
      if (!response.ok) throw new Error(body.message ?? 'Unable to update appointment status.')
      setDetail(body.appointment)
      if (body.warning) setError(body.warning)
      await onChanged()
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update appointment status.')
    } finally {
      setBusy(false)
    }
  }

  async function runConflictAction(
    action:
      | { action: 'cancel' | 'confirm' | 'refund' }
      | { action: 'contact'; channel: 'email' | 'phone' }
      | {
          action: 'reschedule'
          allowNoticeOverride: boolean
          date: string
          time: string
        },
  ) {
    if (!detail) return
    if (action.action === 'refund') {
      const amount = formatMoney((detail.amountPaid ?? 0) / 100, detail.currency)
      if (!window.confirm(`Refund the full fitting fee of ${amount} through Stripe?`)) return
    }
    if (action.action === 'cancel' && !window.confirm('Cancel this paid appointment without a refund?')) {
      return
    }
    if (action.action === 'reschedule' && action.allowNoticeOverride) {
      if (!window.confirm(ADMIN_NOTICE_OVERRIDE_WARNING)) return
    }

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/appointments/calendar/${appointmentId}/paid-conflict`, {
        body: JSON.stringify({ ...action, operationKey: crypto.randomUUID() }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = (await response.json()) as DetailResponse
      if (!response.ok) throw new Error(body.message ?? 'Unable to resolve the paid conflict.')
      setDetail(body.appointment)
      await onChanged()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Unable to resolve the paid conflict.',
      )
    } finally {
      setBusy(false)
    }
  }

  function submitReschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rescheduleDate || !rescheduleTime) return
    void runConflictAction({
      action: 'reschedule',
      allowNoticeOverride: overrideNoticeRules,
      date: rescheduleDate,
      time: rescheduleTime,
    })
  }

  async function resendConfirmation() {
    if (!detail?.capabilities.canResendConfirmation) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(
        `/api/appointments/calendar/${appointmentId}/email/resend-confirmation`,
        {
          body: JSON.stringify({ operationKey: crypto.randomUUID() }),
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      )
      const body = (await response.json()) as DeliveryResponse
      if (!response.ok) throw new Error(body.message ?? 'Unable to queue the confirmation email.')
      setNotice('Confirmation email queued for delivery.')
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : 'Unable to queue the confirmation email.',
      )
    } finally {
      setBusy(false)
    }
  }

  const isPast = detail ? new Date(detail.endAt) <= new Date() : false
  const reopenedStatus = detail ? getReopenedAppointmentStatus(detail.paymentStatus) : null
  const actions: { label: string; status: AppointmentStatus; destructive?: boolean }[] = detail
    ? detail.status === 'pending_payment'
      ? [
          ...(detail.source === 'admin' ? [{ label: 'Mark confirmed', status: 'confirmed' as const }] : []),
          { label: 'Cancel appointment', status: 'cancelled', destructive: true },
        ]
      : detail.status === 'payment_processing' || detail.status === 'payment_failed'
        ? [{ label: 'Cancel appointment', status: 'cancelled', destructive: true }]
      : detail.status === 'confirmed'
        ? [
            ...(isPast ? [{ label: 'Mark completed', status: 'completed' as const }, { label: 'Mark no-show', status: 'no_show' as const }] : []),
            ...(detail.paymentStatus === 'unpaid' ? [{ label: 'Revert to pending payment', status: 'pending_payment' as const }] : []),
            { label: 'Cancel appointment', status: 'cancelled', destructive: true },
          ]
        : detail.status === 'cancelled'
          ? reopenedStatus
            ? [{ label: 'Reopen appointment', status: reopenedStatus }]
            : []
          : []
    : []

  return (
    <Dialog.Root onOpenChange={(open) => { if (!open) onClose() }} open>
      <Dialog.Portal>
        <Dialog.Overlay className="calendar-dialog__overlay" />
        <Dialog.Content className="appointment-drawer">
          <Dialog.Title>Appointment details</Dialog.Title>
          <Dialog.Description>Review booking and payment state, then choose a valid status action.</Dialog.Description>
          <Dialog.Close className="calendar-dialog__close" aria-label="Close appointment details"><X /></Dialog.Close>
          {error ? <p className="calendar-message" role="status">{error}</p> : null}
          {notice ? <p className="calendar-message" role="status">{notice}</p> : null}
          {!detail && !error ? <p>Loading appointment…</p> : null}
          {detail ? (
            <>
              {detail.needsAdminReview ? (
                <p className="calendar-message calendar-message--review" role="alert">
                  <strong>Payment received — admin review required.</strong>{' '}
                  {detail.reviewReason || 'Review this appointment before contacting the customer.'}
                </p>
              ) : null}
              <dl className="appointment-detail-list">
                <div><dt>Customer</dt><dd>{detail.customerName}</dd></div>
                <div><dt>Email</dt><dd><a href={`mailto:${detail.email}`}>{detail.email}</a></dd></div>
                <div><dt>Phone</dt><dd><a href={`tel:${detail.phone}`}>{detail.phone}</a></dd></div>
                <div><dt>Purpose</dt><dd>{getBookingPurposeAdminLabel(detail.purpose)}</dd></div>
                <div><dt>Dress</dt><dd>{detail.dress?.name ?? 'Not selected'}</dd></div>
                <div><dt>Date and time</dt><dd>{formatDateTimeForCustomer(detail.startAt)}</dd></div>
                <div><dt>Status</dt><dd><span className={`calendar-status calendar-status--${detail.status}`}>{detail.status}</span></dd></div>
                <div><dt>Payment</dt><dd><span className={`calendar-status calendar-payment--${detail.paymentStatus}`}>{detail.paymentStatus}</span></dd></div>
                <div><dt>Fitting fee</dt><dd>{formatMoney(detail.fittingFee, detail.currency)}</dd></div>
                <div><dt>Amount paid</dt><dd>{formatMoney((detail.amountPaid ?? 0) / 100, detail.currency)}</dd></div>
                <div><dt>Reference</dt><dd><code>{detail.publicReference}</code></dd></div>
                <div><dt>Source</dt><dd>{detail.source}</dd></div>
                <div><dt>Admin review</dt><dd>{detail.needsAdminReview ? 'Required' : 'No'}</dd></div>
                <div><dt>Conflict contact</dt><dd>{detail.conflictContactedAt ? `${detail.conflictContactMethod ?? 'Recorded'} — ${formatDateTimeForCustomer(detail.conflictContactedAt)}` : 'Not recorded'}</dd></div>
                <div><dt>Conflict resolution</dt><dd>{detail.conflictResolution ?? 'Open'}</dd></div>
                <div><dt>Refund status</dt><dd>{detail.refundStatus ?? 'Not requested'}</dd></div>
                <div><dt>Customer notes</dt><dd>{detail.notes || '—'}</dd></div>
                <div><dt>Internal notes</dt><dd>{detail.internalNotes || '—'}</dd></div>
              </dl>
              {detail.status === 'payment_received_conflict' && detail.paymentStatus === 'paid' ? (
                <section className="paid-conflict-actions" aria-labelledby="paid-conflict-actions-heading">
                  <h3 id="paid-conflict-actions-heading">Resolve paid conflict</h3>
                  <p>
                    Contact the customer using the links above, then record the channel. Do not include
                    internal payment or scheduling errors in customer messages.
                  </p>
                  <div className="appointment-drawer__actions">
                    <button className="calendar-button" disabled={busy} onClick={() => runConflictAction({ action: 'contact', channel: 'email' })} type="button">Record email contact</button>
                    <button className="calendar-button" disabled={busy} onClick={() => runConflictAction({ action: 'contact', channel: 'phone' })} type="button">Record phone contact</button>
                    <button className="calendar-button calendar-button--primary" disabled={busy} onClick={() => runConflictAction({ action: 'confirm' })} type="button">Confirm current slot</button>
                    <button className="calendar-button calendar-button--danger" disabled={busy} onClick={() => runConflictAction({ action: 'cancel' })} type="button">Cancel without refund</button>
                    {detail.capabilities.canRefundPaidConflict ? (
                      <button className="calendar-button calendar-button--danger" disabled={busy} onClick={() => runConflictAction({ action: 'refund' })} type="button">Refund full fitting fee</button>
                    ) : null}
                  </div>
                  <form className="paid-conflict-reschedule" onSubmit={submitReschedule}>
                    <h4>Reschedule and confirm</h4>
                    <div className="new-appointment-form__row">
                      <label>
                        <span>Date</span>
                        <input max={bounds.maxDate} min={bounds.minDate} onChange={(event) => { setRescheduleDate(event.target.value); setRescheduleTime('') }} required type="date" value={rescheduleDate} />
                      </label>
                      <label>
                        <span>Time</span>
                        <select onChange={(event) => setRescheduleTime(event.target.value)} required value={rescheduleTime}>
                          <option disabled value="">Choose time</option>
                          {rescheduleTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="paid-conflict-reschedule__override">
                      <input checked={overrideNoticeRules} onChange={(event) => { setOverrideNoticeRules(event.target.checked); setRescheduleTime('') }} type="checkbox" />
                      <span>Override minimum notice and next-day cutoff</span>
                    </label>
                    {overrideNoticeRules ? <p className="calendar-warning">{ADMIN_NOTICE_OVERRIDE_WARNING}</p> : null}
                    <button className="calendar-button calendar-button--primary" disabled={busy || !rescheduleDate || !rescheduleTime} type="submit">Reschedule and confirm</button>
                  </form>
                </section>
              ) : null}
              <details className="appointment-technical">
                <summary>Technical payment details</summary>
                <dl><div><dt>Checkout Session</dt><dd><code>{detail.stripeCheckoutSessionId || '—'}</code></dd></div>
                <div><dt>Payment Intent</dt><dd><code>{detail.stripePaymentIntentId || '—'}</code></dd></div>
                <div><dt>Refund</dt><dd><code>{detail.stripeRefundId || '—'}</code></dd></div></dl>
              </details>
              <div className="appointment-drawer__actions">
                {detail.capabilities.canResendConfirmation ? (
                  <button
                    className="calendar-button"
                    disabled={busy}
                    onClick={resendConfirmation}
                    type="button"
                  >
                    Resend confirmation email
                  </button>
                ) : null}
                {actions.map((action) => (
                  <button className={action.destructive ? 'calendar-button calendar-button--danger' : 'calendar-button'} disabled={busy} key={action.status} onClick={() => changeStatus(action.status)} type="button">{action.label}</button>
                ))}
                <a className="calendar-button" href={`/admin/collections/appointments/${detail.id}`}>Open full edit page <ExternalLink /></a>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
