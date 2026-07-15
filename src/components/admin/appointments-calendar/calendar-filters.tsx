import type { AppointmentStatus, PaymentStatus } from '@/lib/admin/appointments/calendarTypes'

export type CalendarFilterState = {
  customer: string
  paymentStatus: PaymentStatus | 'all'
  purpose: 'buy' | 'rent' | 'all'
  status: AppointmentStatus | 'all'
  unpaid: boolean
  upcoming: boolean
}

export const initialCalendarFilters: CalendarFilterState = {
  customer: '',
  paymentStatus: 'all',
  purpose: 'all',
  status: 'all',
  unpaid: false,
  upcoming: false,
}

export function CalendarFilters({
  filters,
  onChange,
}: {
  filters: CalendarFilterState
  onChange: (filters: CalendarFilterState) => void
}) {
  const update = <Key extends keyof CalendarFilterState>(key: Key, value: CalendarFilterState[Key]) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="calendar-filters" aria-label="Appointment filters">
      <label>
        <span>Customer</span>
        <input
          onChange={(event) => update('customer', event.target.value)}
          placeholder="Search name"
          type="search"
          value={filters.customer}
        />
      </label>
      <label>
        <span>Status</span>
        <select onChange={(event) => update('status', event.target.value as CalendarFilterState['status'])} value={filters.status}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option><option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option><option value="completed">Completed</option>
          <option value="no-show">No-show</option>
        </select>
      </label>
      <label>
        <span>Payment</span>
        <select onChange={(event) => update('paymentStatus', event.target.value as CalendarFilterState['paymentStatus'])} value={filters.paymentStatus}>
          <option value="all">All payments</option><option value="unpaid">Unpaid</option>
          <option value="pending">Pending</option><option value="paid">Paid</option>
          <option value="refunded">Refunded</option><option value="failed">Failed</option>
        </select>
      </label>
      <label>
        <span>Purpose</span>
        <select onChange={(event) => update('purpose', event.target.value as CalendarFilterState['purpose'])} value={filters.purpose}>
          <option value="all">Buy or rent</option><option value="buy">Buy</option><option value="rent">Rent</option>
        </select>
      </label>
      <label className="calendar-filter-check">
        <input checked={filters.unpaid} onChange={(event) => update('unpaid', event.target.checked)} type="checkbox" />
        <span>Unpaid only</span>
      </label>
      <label className="calendar-filter-check">
        <input checked={filters.upcoming} onChange={(event) => update('upcoming', event.target.checked)} type="checkbox" />
        <span>Upcoming only</span>
      </label>
    </div>
  )
}
