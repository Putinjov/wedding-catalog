'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { ExternalLink, Mail, Phone, X } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

import { AppointmentHistoryPanel } from './appointment-history'
import { AppointmentRescheduleForm } from './appointment-reschedule-form'

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
  const [internalNotes, setInternalNotes] = useState('')
  const operationKeys = useRef(new Map<string, string>())
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

  const applyDetail = useCallback((appointment: AppointmentDetail) => {
    setDetail(appointment)
    setInternalNotes(appointment.internalNotes ?? '')
  }, [])

  function getOperationKey(scope: string): string {
    const existing = operationKeys.current.get(scope)
    if (existing) return existing
    const operationKey = crypto.randomUUID()
    operationKeys.current.set(scope, operationKey)
    return operationKey
  }

  const loadDetail = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`/api/appointments/calendar/${appointmentId}`, {
          credentials: 'same-origin',
          signal,
        })
        const body = (await response.json()) as DetailResponse
        if (!response.ok) throw new Error(body.message ?? 'Unable to load appointment details.')
        applyDetail(body.appointment)
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unable to load appointment details.',
        )
      }
    },
    [appointmentId, applyDetail],
  )

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() => loadDetail(controller.signal))
    return () => controller.abort()
  }, [loadDetail])

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
      applyDetail(body.appointment)
      if (body.warning) setNotice(body.warning)
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
    const operationScope =
      action.action === 'reschedule'
        ? `paid-conflict-reschedule:${action.date}:${action.time}:${String(action.allowNoticeOverride)}`
        : `paid-conflict:${action.action}`

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/appointments/calendar/${appointmentId}/paid-conflict`, {
        body: JSON.stringify({ ...action, operationKey: getOperationKey(operationScope) }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = (await response.json()) as DetailResponse
      if (!response.ok) throw new Error(body.message ?? 'Unable to resolve the paid conflict.')
      applyDetail(body.appointment)
      operationKeys.current.delete(operationScope)
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
    if (detail?.status === 'payment_received_conflict') {
      void runConflictAction({
        action: 'reschedule',
        allowNoticeOverride: overrideNoticeRules,
        date: rescheduleDate,
        time: rescheduleTime,
      })
      return
    }

    void rescheduleConfirmedAppointment()
  }

  async function rescheduleConfirmedAppointment() {
    if (!detail?.capabilities.canReschedule || !rescheduleDate || !rescheduleTime) return
    if (overrideNoticeRules && !window.confirm(ADMIN_NOTICE_OVERRIDE_WARNING)) return
    const operationScope = `reschedule:${rescheduleDate}:${rescheduleTime}:${String(overrideNoticeRules)}`

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/appointments/calendar/${appointmentId}/reschedule`, {
        body: JSON.stringify({
          allowNoticeOverride: overrideNoticeRules,
          date: rescheduleDate,
          operationKey: getOperationKey(operationScope),
          time: rescheduleTime,
        }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = (await response.json()) as DetailResponse
      if (!response.ok) throw new Error(body.message ?? 'Unable to reschedule the appointment.')
      applyDetail(body.appointment)
      operationKeys.current.delete(operationScope)
      setRescheduleDate('')
      setRescheduleTime('')
      setOverrideNoticeRules(false)
      setNotice('Appointment rescheduled and customer email queued.')
      await onChanged()
    } catch (rescheduleError) {
      setError(
        rescheduleError instanceof Error
          ? rescheduleError.message
          : 'Unable to reschedule the appointment.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function saveInternalNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!detail?.capabilities.canEditInternalNotes) return

    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/appointments/calendar/${appointmentId}/notes`, {
        body: JSON.stringify({ internalNotes, operationKey: getOperationKey('notes') }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const body = (await response.json()) as DetailResponse
      if (!response.ok) throw new Error(body.message ?? 'Unable to save internal notes.')
      applyDetail(body.appointment)
      operationKeys.current.delete('notes')
      setNotice('Internal notes saved.')
    } catch (notesError) {
      setError(notesError instanceof Error ? notesError.message : 'Unable to save internal notes.')
    } finally {
      setBusy(false)
    }
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
          body: JSON.stringify({ operationKey: getOperationKey('resend-confirmation') }),
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      )
      const body = (await response.json()) as DeliveryResponse
      if (!response.ok) throw new Error(body.message ?? 'Unable to queue the confirmation email.')
      operationKeys.current.delete('resend-confirmation')
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
        <Dialog.Content aria-busy={busy} className="appointment-drawer">
          <Dialog.Title>Appointment details</Dialog.Title>
          <Dialog.Description>Review booking and payment state, then choose a valid status action.</Dialog.Description>
          <Dialog.Close className="calendar-dialog__close" aria-label="Close appointment details"><X /></Dialog.Close>
          {error ? <p className="calendar-message calendar-message--error" role="alert">{error}</p> : null}
          {notice ? <p aria-live="polite" className="calendar-message" role="status">{notice}</p> : null}
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
              </dl>
              <nav aria-label="Customer contact actions" className="appointment-contact-actions">
                <a className="calendar-button" href={`mailto:${detail.email}`}>
                  <Mail aria-hidden="true" /> Email customer
                </a>
                <a className="calendar-button" href={`tel:${detail.phone}`}>
                  <Phone aria-hidden="true" /> Call customer
                </a>
              </nav>
              {detail.capabilities.canEditInternalNotes ? (
                <form className="appointment-notes" onSubmit={saveInternalNotes}>
                  <label htmlFor="appointment-internal-notes">Internal notes</label>
                  <textarea
                    id="appointment-internal-notes"
                    maxLength={1000}
                    onChange={(event) => {
                      operationKeys.current.delete('notes')
                      setInternalNotes(event.target.value)
                    }}
                    rows={4}
                    value={internalNotes}
                  />
                  <p>Internal only. Do not copy unnecessary customer or payment data here.</p>
                  <button className="calendar-button" disabled={busy} type="submit">
                    Save internal notes
                  </button>
                </form>
              ) : null}
              {detail.capabilities.canReschedule ? (
                <section
                  aria-label="Reschedule appointment"
                  className="appointment-standard-actions"
                >
                  <AppointmentRescheduleForm
                    bounds={bounds}
                    busy={busy}
                    buttonLabel="Reschedule appointment"
                    date={rescheduleDate}
                    heading="Reschedule appointment"
                    onDateChange={(value) => {
                      setRescheduleDate(value)
                      setRescheduleTime('')
                    }}
                    onOverrideChange={(value) => {
                      setOverrideNoticeRules(value)
                      setRescheduleTime('')
                    }}
                    onSubmit={submitReschedule}
                    onTimeChange={setRescheduleTime}
                    overrideNoticeRules={overrideNoticeRules}
                    time={rescheduleTime}
                    times={rescheduleTimes}
                  />
                </section>
              ) : null}
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
                  <AppointmentRescheduleForm
                    bounds={bounds}
                    busy={busy}
                    buttonLabel="Reschedule and confirm"
                    date={rescheduleDate}
                    heading="Reschedule and confirm"
                    onDateChange={(value) => {
                      setRescheduleDate(value)
                      setRescheduleTime('')
                    }}
                    onOverrideChange={(value) => {
                      setOverrideNoticeRules(value)
                      setRescheduleTime('')
                    }}
                    onSubmit={submitReschedule}
                    onTimeChange={setRescheduleTime}
                    overrideNoticeRules={overrideNoticeRules}
                    time={rescheduleTime}
                    times={rescheduleTimes}
                  />
                </section>
              ) : null}
              <AppointmentHistoryPanel detail={detail} />
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
