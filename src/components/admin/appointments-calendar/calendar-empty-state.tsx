export function CalendarEmptyState() {
  return (
    <p className="calendar-empty" role="status">
      No appointments match this date range and the current filters. The calendar remains available
      for navigation or creating a manual appointment.
    </p>
  )
}
