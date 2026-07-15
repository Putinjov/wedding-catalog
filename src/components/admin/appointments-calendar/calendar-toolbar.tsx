import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

import type { CalendarViewMode } from '@/lib/admin/appointments/calendarDate'

export function CalendarToolbar({
  date,
  onDateChange,
  onNavigate,
  onNew,
  onToday,
  onViewChange,
  view,
}: {
  date: string
  onDateChange: (date: string) => void
  onNavigate: (direction: -1 | 1) => void
  onNew: () => void
  onToday: () => void
  onViewChange: (view: CalendarViewMode) => void
  view: CalendarViewMode
}) {
  return (
    <div className="appointments-calendar__toolbar" aria-label="Calendar controls">
      <div className="appointments-calendar__toolbar-group">
        <button className="calendar-button calendar-button--icon" onClick={() => onNavigate(-1)} type="button">
          <ChevronLeft aria-hidden="true" />
          <span className="sr-only">Previous {view}</span>
        </button>
        <button className="calendar-button" onClick={onToday} type="button">Today</button>
        <button className="calendar-button calendar-button--icon" onClick={() => onNavigate(1)} type="button">
          <ChevronRight aria-hidden="true" />
          <span className="sr-only">Next {view}</span>
        </button>
        <label className="calendar-date-control">
          <CalendarDays aria-hidden="true" />
          <span className="sr-only">Selected date</span>
          <input onChange={(event) => onDateChange(event.target.value)} type="date" value={date} />
        </label>
      </div>
      <div className="appointments-calendar__toolbar-group">
        <div className="calendar-segmented" aria-label="Calendar view">
          <button aria-pressed={view === 'week'} onClick={() => onViewChange('week')} type="button">Week</button>
          <button aria-pressed={view === 'day'} onClick={() => onViewChange('day')} type="button">Day</button>
        </div>
        <button className="calendar-button calendar-button--primary" onClick={onNew} type="button">
          <Plus aria-hidden="true" /> New appointment
        </button>
      </div>
    </div>
  )
}
