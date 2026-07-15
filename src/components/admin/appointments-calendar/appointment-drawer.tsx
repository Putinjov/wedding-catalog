'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { ExternalLink, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { AppointmentDetail, AppointmentStatus } from '@/lib/admin/appointments/calendarTypes'
import { formatDateTimeForCustomer } from '@/lib/booking/date'
import {
  PAID_CANCELLATION_WARNING,
  PAID_REOPEN_WARNING,
  UNPAID_MANUAL_CONFIRMATION_WARNING,
} from '@/lib/admin/appointments/statusWarnings'

type DetailResponse = { appointment: AppointmentDetail; warning?: string | null; message?: string }

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IE', { currency, style: 'currency' }).format(amount)
}

export function AppointmentDrawer({
  appointmentId,
  onChanged,
  onClose,
}: {
  appointmentId: string
  onChanged: () => Promise<void>
  onClose: () => void
}) {
  const [detail, setDetail] = useState<AppointmentDetail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
    if (status === 'confirmed' && detail.paymentStatus !== 'paid' && detail.source === 'admin') {
      if (!window.confirm(UNPAID_MANUAL_CONFIRMATION_WARNING)) return
      options.allowUnpaidManualConfirmation = true
    }
    if (status === 'pending' && detail.status === 'cancelled' && detail.paymentStatus === 'paid') {
      if (!window.confirm(PAID_REOPEN_WARNING)) return
      options.acknowledgePaidReopen = true
    }

    setBusy(true)
    setError('')
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

  const isPast = detail ? new Date(detail.endAt) <= new Date() : false
  const actions: { label: string; status: AppointmentStatus; destructive?: boolean }[] = detail
    ? detail.status === 'pending'
      ? [{ label: 'Mark confirmed', status: 'confirmed' }, { label: 'Cancel appointment', status: 'cancelled', destructive: true }]
      : detail.status === 'confirmed'
        ? [
            ...(isPast ? [{ label: 'Mark completed', status: 'completed' as const }, { label: 'Mark no-show', status: 'no-show' as const }] : []),
            { label: 'Revert to pending', status: 'pending' },
            { label: 'Cancel appointment', status: 'cancelled', destructive: true },
          ]
        : detail.status === 'cancelled'
          ? [{ label: 'Revert to pending', status: 'pending' }]
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
          {!detail && !error ? <p>Loading appointment…</p> : null}
          {detail ? (
            <>
              <dl className="appointment-detail-list">
                <div><dt>Customer</dt><dd>{detail.customerName}</dd></div>
                <div><dt>Email</dt><dd><a href={`mailto:${detail.email}`}>{detail.email}</a></dd></div>
                <div><dt>Phone</dt><dd><a href={`tel:${detail.phone}`}>{detail.phone}</a></dd></div>
                <div><dt>Purpose</dt><dd>{detail.purpose === 'buy' ? 'Buy' : 'Rent'}</dd></div>
                <div><dt>Dress</dt><dd>{detail.dress?.name ?? 'Not selected'}</dd></div>
                <div><dt>Date and time</dt><dd>{formatDateTimeForCustomer(detail.startAt)}</dd></div>
                <div><dt>Status</dt><dd><span className={`calendar-status calendar-status--${detail.status}`}>{detail.status}</span></dd></div>
                <div><dt>Payment</dt><dd><span className={`calendar-status calendar-payment--${detail.paymentStatus}`}>{detail.paymentStatus}</span></dd></div>
                <div><dt>Fitting fee</dt><dd>{formatMoney(detail.fittingFee, detail.currency)}</dd></div>
                <div><dt>Amount paid</dt><dd>{formatMoney((detail.amountPaid ?? 0) / 100, detail.currency)}</dd></div>
                <div><dt>Reference</dt><dd><code>{detail.publicReference}</code></dd></div>
                <div><dt>Source</dt><dd>{detail.source}</dd></div>
                <div><dt>Customer notes</dt><dd>{detail.notes || '—'}</dd></div>
                <div><dt>Internal notes</dt><dd>{detail.internalNotes || '—'}</dd></div>
              </dl>
              <details className="appointment-technical">
                <summary>Technical payment details</summary>
                <dl><div><dt>Checkout Session</dt><dd><code>{detail.stripeCheckoutSessionId || '—'}</code></dd></div>
                <div><dt>Payment Intent</dt><dd><code>{detail.stripePaymentIntentId || '—'}</code></dd></div></dl>
              </details>
              <div className="appointment-drawer__actions">
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
