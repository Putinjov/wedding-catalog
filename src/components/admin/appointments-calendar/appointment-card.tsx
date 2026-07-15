import { formatTimeForCustomer } from '@/lib/booking/date'
import type { CalendarAppointment } from '@/lib/admin/appointments/calendarTypes'

export function AppointmentCard({ appointment, onOpen }: { appointment: CalendarAppointment; onOpen: () => void }) {
  return (
    <button
      className={`appointment-card appointment-card--${appointment.status}`}
      onClick={onOpen}
      type="button"
    >
      <span className="appointment-card__time">{formatTimeForCustomer(appointment.startAt)}</span>
      <strong>{appointment.customerName}</strong>
      <span>{appointment.purpose === 'buy' ? 'Buy' : 'Rent'}{appointment.dress ? ` · ${appointment.dress.name}` : ''}</span>
      <span className="appointment-card__states">
        <span>{appointment.status}</span><span>{appointment.paymentStatus}</span>
      </span>
    </button>
  )
}
