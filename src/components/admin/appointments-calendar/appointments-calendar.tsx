'use client'

import { addCalendarDays, getDateKey } from '@/lib/booking/date'
import { getVisibleRange, type CalendarViewMode } from '@/lib/admin/appointments/calendarDate'
import type { CalendarAppointment, ManualAppointmentDress } from '@/lib/admin/appointments/calendarTypes'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import { AppointmentDrawer } from './appointment-drawer'
import { CalendarFilters, initialCalendarFilters } from './calendar-filters'
import { CalendarSummary } from './calendar-summary'
import { CalendarToolbar } from './calendar-toolbar'
import { DayView } from './day-view'
import { NewAppointmentDialog } from './new-appointment-dialog'
import { WeekView } from './week-view'
import './appointments-calendar.scss'

type CalendarResponse = { appointments?: CalendarAppointment[]; message?: string }

function subscribeToNarrowViewport(onChange: () => void) {
  const media = window.matchMedia('(max-width: 768px)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getNarrowViewportSnapshot() {
  return window.matchMedia('(max-width: 768px)').matches
}

export function AppointmentsCalendar({ dresses }: { dresses: ManualAppointmentDress[] }) {
  const [date, setDate] = useState(() => getDateKey())
  const [view, setView] = useState<CalendarViewMode>('week')
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [filters, setFilters] = useState(initialCalendarFilters)
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterNow] = useState(() => Date.now())
  const isNarrow = useSyncExternalStore(subscribeToNarrowViewport, getNarrowViewportSnapshot, () => false)
  const activeView: CalendarViewMode = isNarrow ? 'day' : view
  const range = useMemo(() => getVisibleRange(date, activeView), [activeView, date])

  const loadAppointments = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to })
      const response = await fetch(`/api/appointments/calendar?${params}`, {
        credentials: 'same-origin',
        signal,
      })
      const body = (await response.json()) as CalendarResponse
      if (!response.ok) throw new Error(body.message ?? 'Unable to load appointments.')
      setAppointments(body.appointments ?? [])
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return
      setError(loadError instanceof Error ? loadError.message : 'Unable to load appointments.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() => loadAppointments(controller.signal))
    return () => controller.abort()
  }, [loadAppointments])

  const filtered = useMemo(() => {
    const customer = filters.customer.trim().toLocaleLowerCase('en-IE')
    return appointments.filter((appointment) => {
      if (customer && !appointment.customerName.toLocaleLowerCase('en-IE').includes(customer)) return false
      if (filters.status !== 'all' && appointment.status !== filters.status) return false
      if (filters.paymentStatus !== 'all' && appointment.paymentStatus !== filters.paymentStatus) return false
      if (filters.purpose !== 'all' && appointment.purpose !== filters.purpose) return false
      if (filters.unpaid && appointment.paymentStatus !== 'unpaid') return false
      if (filters.upcoming && (new Date(appointment.startAt).getTime() <= filterNow || ['cancelled', 'completed', 'no-show'].includes(appointment.status))) return false
      return true
    })
  }, [appointments, filterNow, filters])

  function navigate(direction: -1 | 1) {
    setDate((current) => addCalendarDays(current, direction * (activeView === 'week' ? 7 : 1)) ?? current)
  }

  function selectDay(day: string) {
    setDate(day)
    setView('day')
  }

  return (
    <main className="appointments-calendar">
      <header className="appointments-calendar__header">
        <div><span className="appointments-calendar__eyebrow">Bookings</span><h1>Appointments calendar</h1><p>Times shown in Europe/Dublin. Payment and appointment states are managed separately.</p></div>
      </header>
      <CalendarToolbar date={date} onDateChange={setDate} onNavigate={navigate} onNew={() => setNewOpen(true)} onToday={() => setDate(getDateKey())} onViewChange={setView} view={activeView} />
      <CalendarFilters filters={filters} onChange={setFilters} />
      <CalendarSummary appointments={filtered} />
      {error ? <p className="calendar-message calendar-message--error" role="alert">{error}</p> : null}
      {loading ? <p className="calendar-loading" role="status">Loading appointments…</p> : activeView === 'week' ? (
        <WeekView appointments={filtered} dateKeys={range.keys} onOpen={setSelectedID} onSelectDay={selectDay} />
      ) : (
        <DayView allAppointments={appointments} appointments={filtered} dateKey={date} onOpen={setSelectedID} />
      )}
      {selectedID ? <AppointmentDrawer appointmentId={selectedID} onChanged={() => loadAppointments()} onClose={() => setSelectedID(null)} /> : null}
      <NewAppointmentDialog dresses={dresses} onCreated={() => loadAppointments()} onOpenChange={setNewOpen} open={newOpen} />
    </main>
  )
}
