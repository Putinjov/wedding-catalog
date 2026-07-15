import { formatCalendarDate } from '@/lib/admin/appointments/calendarDate'
import type { CalendarAppointment } from '@/lib/admin/appointments/calendarTypes'
import { formatTimeInputValue, getConfiguredSlotTimes, getDateKey, isClosedDate } from '@/lib/booking/date'

import { AppointmentCard } from './appointment-card'

export function DayView({
  allAppointments,
  appointments,
  dateKey,
  onOpen,
}: {
  allAppointments: CalendarAppointment[]
  appointments: CalendarAppointment[]
  dateKey: string
  onOpen: (id: string) => void
}) {
  const visibleIDs = new Set(appointments.map((appointment) => appointment.id))
  const dayAppointments = allAppointments.filter(
    (appointment) => getDateKey(new Date(appointment.startAt)) === dateKey,
  )

  return (
    <section className="day-view" aria-label="Daily appointment schedule">
      <header>
        <div><span>Day schedule</span><h2>{formatCalendarDate(dateKey, { dateStyle: 'full' })}</h2></div>
        {isClosedDate(dateKey) ? <strong className="day-view__closed">Closed</strong> : null}
      </header>
      {isClosedDate(dateKey) ? (
        <p className="calendar-empty">The boutique is closed. No fitting slots are available.</p>
      ) : (
        <ol className="day-view__slots">
          {getConfiguredSlotTimes().map((time) => {
            const atTime = dayAppointments.filter(
              (appointment) => formatTimeInputValue(appointment.startAt) === time,
            )
            const active = atTime.filter((appointment) => appointment.status !== 'cancelled')
            const visible = atTime.filter((appointment) => visibleIDs.has(appointment.id))
            return (
              <li className={active.length > 0 ? 'is-occupied' : 'is-free'} key={time}>
                <time>{time}</time>
                <div>
                  <span className="day-view__slot-state">{active.length > 0 ? 'Occupied' : 'Free'}</span>
                  {visible.map((appointment) => (
                    <AppointmentCard
                      appointment={appointment}
                      key={appointment.id}
                      onOpen={() => onOpen(String(appointment.id))}
                    />
                  ))}
                  {active.length > 0 && visible.length === 0 ? (
                    <span className="day-view__filtered">Appointment hidden by filters</span>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
