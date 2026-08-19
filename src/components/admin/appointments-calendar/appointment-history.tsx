import type {
  AppointmentAuditHistoryEntry,
  AppointmentDetail,
} from '@/lib/admin/appointments/calendarTypes'
import { formatDateTimeForCustomer } from '@/lib/booking/date'

function formatAction(action: string): string {
  const normalized = action.replace(/^appointment\./, '').replaceAll('_', ' ').replaceAll('.', ' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function formatMoneyFromCents(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IE', { currency, style: 'currency' }).format(amount / 100)
}

function HistoryEmpty({ children }: { children: string }) {
  return <p className="appointment-history__empty">{children}</p>
}

function StatusHistory({ entries }: { entries: AppointmentAuditHistoryEntry[] }) {
  const statusEntries = entries.filter(
    (entry) => entry.previousStatus && entry.newStatus && entry.previousStatus !== entry.newStatus,
  )

  return (
    <section aria-labelledby="appointment-status-history-heading">
      <h4 id="appointment-status-history-heading">Status history</h4>
      {statusEntries.length === 0 ? (
        <HistoryEmpty>No recorded status changes.</HistoryEmpty>
      ) : (
        <ol className="appointment-history__list">
          {statusEntries.map((entry) => (
            <li key={entry.id}>
              <span>
                <strong>{entry.previousStatus?.replaceAll('_', ' ')}</strong>
                {' → '}
                <strong>{entry.newStatus?.replaceAll('_', ' ')}</strong>
              </span>
              <small>{formatDateTimeForCustomer(entry.timestamp)} · {entry.actorLabel}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function PaymentHistory({
  currency,
  entries,
}: {
  currency: AppointmentDetail['currency']
  entries: AppointmentAuditHistoryEntry[]
}) {
  const paymentEntries = entries.filter(
    (entry) =>
      entry.action.includes('payment') ||
      entry.action.includes('refund') ||
      (entry.previousPaymentStatus != null &&
        entry.previousPaymentStatus !== entry.paymentStatus) ||
      entry.refundAmount != null ||
      entry.refundStatus != null,
  )

  return (
    <section aria-labelledby="appointment-payment-history-heading">
      <h4 id="appointment-payment-history-heading">Payment history</h4>
      {paymentEntries.length === 0 ? (
        <HistoryEmpty>No recorded payment changes.</HistoryEmpty>
      ) : (
        <ol className="appointment-history__list">
          {paymentEntries.map((entry) => (
            <li key={entry.id}>
              <span>
                {entry.previousPaymentStatus && entry.paymentStatus ? (
                  <>
                    <strong>{entry.previousPaymentStatus.replaceAll('_', ' ')}</strong>
                    {' → '}
                  </>
                ) : null}
                <strong>{entry.paymentStatus?.replaceAll('_', ' ') ?? 'Payment update'}</strong>
                {entry.refundAmount != null
                  ? ` · ${formatMoneyFromCents(entry.refundAmount, currency)}`
                  : ''}
                {entry.refundStatus ? ` · ${entry.refundStatus.replaceAll('_', ' ')}` : ''}
              </span>
              <small>{formatDateTimeForCustomer(entry.timestamp)} · {entry.actorLabel}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function AppointmentHistoryPanel({ detail }: { detail: AppointmentDetail }) {
  const showAuditHistory = detail.capabilities.canViewAuditTrail
  const showEmailHistory = detail.capabilities.canViewEmailHistory
  if (!showAuditHistory && !showEmailHistory) return null

  return (
    <details className="appointment-history">
      <summary>History and audit trail</summary>
      <div className="appointment-history__content">
        {showAuditHistory ? (
          <>
            <StatusHistory entries={detail.history.audits} />
            <PaymentHistory currency={detail.currency} entries={detail.history.audits} />
            <section aria-labelledby="appointment-audit-trail-heading">
              <h4 id="appointment-audit-trail-heading">Audit trail</h4>
              {detail.history.audits.length === 0 ? (
                <HistoryEmpty>No audit entries are available.</HistoryEmpty>
              ) : (
                <ol className="appointment-history__list">
                  {detail.history.audits.map((entry) => (
                    <li key={entry.id}>
                      <span><strong>{formatAction(entry.action)}</strong></span>
                      <small>{formatDateTimeForCustomer(entry.timestamp)} · {entry.actorLabel}</small>
                      {entry.noticeRulesOverridden ? <em>Notice rules overridden</em> : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        ) : null}
        {showEmailHistory ? (
          <section aria-labelledby="appointment-email-history-heading">
            <h4 id="appointment-email-history-heading">Email delivery history</h4>
            {detail.history.emails.length === 0 ? (
              <HistoryEmpty>No email deliveries are recorded.</HistoryEmpty>
            ) : (
              <ol className="appointment-history__list">
                {detail.history.emails.map((entry) => (
                  <li key={entry.id}>
                    <span>
                      <strong>{entry.event.replaceAll('_', ' ')}</strong>
                      {' · '}
                      {entry.status}
                      {entry.trigger === 'manual' ? ' · manual resend' : ''}
                    </span>
                    <small>
                      {formatDateTimeForCustomer(entry.sentAt ?? entry.createdAt)} · {entry.attempts}{' '}
                      {entry.attempts === 1 ? 'attempt' : 'attempts'}
                    </small>
                    {entry.failureCategory ? <em>{entry.failureCategory}</em> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : null}
      </div>
    </details>
  )
}
