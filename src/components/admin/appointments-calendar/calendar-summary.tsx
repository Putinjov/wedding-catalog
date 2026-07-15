import type { CalendarAppointment } from '@/lib/admin/appointments/calendarTypes'

export function CalendarSummary({ appointments }: { appointments: CalendarAppointment[] }) {
  const counters = [
    ['Total', appointments.length],
    ['Confirmed', appointments.filter((item) => item.status === 'confirmed').length],
    ['Pending payment', appointments.filter((item) => item.paymentStatus === 'pending').length],
    ['Cancelled', appointments.filter((item) => item.status === 'cancelled').length],
    ['Completed', appointments.filter((item) => item.status === 'completed').length],
    ['No-show', appointments.filter((item) => item.status === 'no-show').length],
  ] as const

  return (
    <dl className="calendar-summary">
      {counters.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  )
}
