import { formatCalendarDate } from '@/lib/admin/appointments/calendarDate'
import type { CalendarAppointment } from '@/lib/admin/appointments/calendarTypes'
import { getDateKey } from '@/lib/booking/date'
import { isClosedDate } from '@/lib/booking/date'
import type { ResolvedBookingSettings } from '@/config/booking'

import { AppointmentCard } from './appointment-card'

export function MonthView({
  appointments,
  dateKeys,
  selectedDate,
  onOpen,
  onSelectDay,
  settings,
}: {
  appointments: CalendarAppointment[]
  dateKeys: string[]
  selectedDate: string
  onOpen: (id: string) => void
  onSelectDay: (date: string) => void
  settings: ResolvedBookingSettings
}) {
  const today = getDateKey()
  const selectedMonth = selectedDate.slice(0, 7)

  return (
    <section className="month-view" aria-label="Monthly appointment calendar">
      <div className="month-view__weekdays" aria-hidden="true">
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
          (day) => <span key={day}>{day.slice(0, 3)}</span>,
        )}
      </div>
      <div className="month-view__grid">
        {dateKeys.map((dateKey) => {
          const dayAppointments = appointments.filter(
            (appointment) => getDateKey(new Date(appointment.startAt)) === dateKey,
          )
          const outsideMonth = !dateKey.startsWith(selectedMonth)

          const closed = isClosedDate(dateKey, settings)
          const dots = dayAppointments.slice(0, 3)

          return (
            <div
              className={`month-view__day${outsideMonth ? ' is-outside-month' : ''}${dateKey === today ? ' is-today' : ''}${dateKey === selectedDate ? ' is-selected' : ''}${closed ? ' is-closed' : ''}`}
              key={dateKey}
            >
              <button
                aria-label={`Open ${formatCalendarDate(dateKey, { dateStyle: 'full' })}, ${dayAppointments.length} appointments${closed ? ', closed' : ''}`}
                aria-pressed={dateKey === selectedDate}
                className="month-view__date"
                onClick={() => onSelectDay(dateKey)}
                type="button"
              >
                <span>{formatCalendarDate(dateKey, { day: 'numeric' })}</span>
                {dateKey === today ? <small>Today</small> : null}
                {closed ? <small>Closed</small> : null}
              </button>
              <div className="month-view__indicators" aria-hidden="true">
                {dots.map((appointment) => <span key={appointment.id} className={`month-view__dot is-${appointment.status}`} />)}
                {dayAppointments.length > 3 && <span className="month-view__extra">+{dayAppointments.length - 3}</span>}
                {closed && <span className="month-view__closure-mark" />}
              </div>
              <div className="month-view__events">
                {dayAppointments.map((appointment) => (
                  <AppointmentCard
                    appointment={appointment}
                    key={appointment.id}
                    onOpen={() => onOpen(String(appointment.id))}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
