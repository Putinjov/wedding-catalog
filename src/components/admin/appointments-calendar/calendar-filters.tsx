import type { AppointmentStatus, PaymentStatus } from '@/lib/admin/appointments/calendarTypes'
import { appointmentPaymentStatusValues, appointmentStatusValues } from '@/lib/booking/appointmentLifecycle'
import type { Appointment } from '@/payload-types'

export type CalendarFilterState = {
  customer: string
  paymentStatus: PaymentStatus | 'all'
  purpose: Appointment['purpose'] | 'all'
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
          {appointmentStatusValues.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
        </select>
      </label>
      <label>
        <span>Payment</span>
        <select onChange={(event) => update('paymentStatus', event.target.value as CalendarFilterState['paymentStatus'])} value={filters.paymentStatus}>
          <option value="all">All payments</option>
          {appointmentPaymentStatusValues.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
        </select>
      </label>
      <label>
        <span>Purpose</span>
        <select onChange={(event) => update('purpose', event.target.value as CalendarFilterState['purpose'])} value={filters.purpose}>
          <option value="all">All purposes</option><option value="buy">Buy</option><option value="rent">Rent</option><option value="undecided">Undecided</option>
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
