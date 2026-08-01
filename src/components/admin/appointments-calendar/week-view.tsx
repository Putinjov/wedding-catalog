import { bookingConfig } from '@/config/booking'
import { formatCalendarDate } from '@/lib/admin/appointments/calendarDate'
import type { CalendarAppointment } from '@/lib/admin/appointments/calendarTypes'
import { formatTimeInputValue, getConfiguredSlotTimes, getDateKey, isClosedDate } from '@/lib/booking/date'

import { AppointmentCard } from './appointment-card'

export function WeekView({
  appointments,
  dateKeys,
  onOpen,
  onSelectDay,
}: {
  appointments: CalendarAppointment[]
  dateKeys: string[]
  onOpen: (id: string) => void
  onSelectDay: (date: string) => void
}) {
  const today = getDateKey()
  const slots = getConfiguredSlotTimes()

  return (
    <div className="week-view" aria-label="Weekly appointment calendar">
      <div className="week-view__corner">{bookingConfig.timezone}</div>
      {dateKeys.map((dateKey) => (
        <button
          aria-current={dateKey === today ? 'date' : undefined}
          className={`week-view__day-heading${dateKey === today ? ' is-today' : ''}`}
          key={dateKey}
          onClick={() => onSelectDay(dateKey)}
          type="button"
        >
          <span>{formatCalendarDate(dateKey, { weekday: 'short' })}</span>
          <strong>{formatCalendarDate(dateKey, { day: 'numeric', month: 'short' })}</strong>
          {isClosedDate(dateKey) ? <small>Closed</small> : null}
        </button>
      ))}
      {slots.map((time) => (
        <div className="week-view__row" key={time}>
          <time>{time}</time>
          {dateKeys.map((dateKey) => {
            const slotAppointments = appointments.filter(
              (appointment) =>
                getDateKey(new Date(appointment.startAt)) === dateKey &&
                formatTimeInputValue(appointment.startAt) === time,
            )
            return (
              <div className={`week-view__slot${isClosedDate(dateKey) ? ' is-closed' : ''}`} key={dateKey}>
                {isClosedDate(dateKey) ? (
                  <span className="week-view__closed-label">Closed</span>
                ) : (
                  slotAppointments.map((appointment) => (
                    <AppointmentCard
                      appointment={appointment}
                      key={appointment.id}
                      onOpen={() => onOpen(String(appointment.id))}
                    />
                  ))
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
