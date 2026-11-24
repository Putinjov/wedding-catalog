'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ResolvedBookingSettings } from '@/config/booking'
import { getConfiguredSlotTimes, getOpeningHours, isClosedDate, isValidSlotTime } from '@/lib/booking/date'

export function AvailabilityControls({ date, settings }: { date: string; settings: ResolvedBookingSettings }) {
  const router = useRouter()
  const hours = getOpeningHours(date, settings) ?? settings.weekdayHours
  const [opening, setOpening] = useState(hours.start)
  const [closing, setClosing] = useState(hours.end)
  const customHours = settings.dateHours?.find(item => item.date === date)
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('11:00')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const blocked = settings.blockedIntervals.filter((item) => item.date === date)
  const exceptional = settings.holidays.includes(date) || settings.closures.some((item) => item.startDate <= date && item.endDate >= date)

  const configured = getConfiguredSlotTimes({ ...settings, blockedIntervals: [] }, date)
  function slotEnd(time: string) {
    const [hour, minute] = time.split(':').map(Number)
    const endMinutes = hour * 60 + minute + settings.durationMinutes
    return String(Math.floor(endMinutes / 60)).padStart(2, '0') + ':' + String(endMinutes % 60).padStart(2, '0')
  }

  async function change(kind: 'closures' | 'blocked-intervals', closed: boolean, from = start, to = end) {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/globals/booking-settings/' + kind, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'closures'
          ? { startDate: date, endDate: date, closed }
          : { date, start: from, end: to, closed }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Unable to change availability.')
      setMessage('Availability updated. Existing appointments have not been cancelled.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to change availability.')
    } finally {
      setBusy(false)
    }
  }

  async function saveHours(mode: 'custom' | 'default') {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/globals/booking-settings/date-hours', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, mode, start: opening, end: closing }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Unable to change opening hours.')
      setMessage('Opening hours updated. Existing appointments remain unchanged.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to change opening hours.')
    } finally { setBusy(false) }
  }

  return (
    <section className="manager-availability" aria-label="Manage booking availability">
      <h2>Manage availability</h2>
      <p>{date} · {isClosedDate(date, settings) ? 'Closed day' : 'Open day'} · Europe/Dublin</p>
      <p>Changes affect new bookings only. Existing appointments remain in place. Custom hours replace the weekly schedule for this date. Breaks, blocked intervals and other booking rules still apply.</p>
      <div className="manager-availability__actions">
        <button type="button" className="calendar-button" disabled={busy || exceptional} onClick={() => void change('closures', true)}>Close day</button>
        <button type="button" className="calendar-button" disabled={busy || !exceptional} onClick={() => void change('closures', false)}>Remove day closure</button>
      </div>
      <details>
        <summary>{customHours ? `Custom opening hours: ${customHours.start}–${customHours.end}` : 'Set custom opening hours'}</summary>
        <p>Saving custom hours opens this date even on a regular day off, and removes any explicit day closure. Existing bookings are not cancelled.</p>
        <div className="manager-availability__actions">
          <label>Opening <input type="time" value={opening} onChange={event => setOpening(event.target.value)} /></label>
          <label>Closing <input type="time" value={closing} onChange={event => setClosing(event.target.value)} /></label>
          <button type="button" className="calendar-button" disabled={busy || !opening || !closing || opening >= closing} onClick={() => void saveHours('custom')}>Save hours &amp; open day</button>
          {customHours && <button type="button" className="calendar-button" disabled={busy} onClick={() => void saveHours('default')}>Restore regular hours</button>}
        </div>
      </details>
      {!isClosedDate(date, settings) && <div className="manager-slot-controls">{configured.map((time) => {
        const until = slotEnd(time)
        const available = isValidSlotTime(date, time, settings)
        const overlaps = blocked.filter((item) => item.start < until && item.end > time)
        return <button className="calendar-button" key={time} type="button" disabled={busy || (!available && overlaps.length === 0)} onClick={() => void change('blocked-intervals', available, time, until)}>{time}–{until} · {available ? 'Block' : 'Unblock'}</button>
      })}</div>}
      <details><summary>Custom time range</summary><div className="manager-availability__actions">
        <label>From <input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label>To <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        <button type="button" className="calendar-button" disabled={busy || !start || !end || start >= end} onClick={() => void change('blocked-intervals', true)}>Block hours</button>
        <button type="button" className="calendar-button" disabled={busy || !start || !end || start >= end} onClick={() => void change('blocked-intervals', false)}>Unblock hours</button>
      </div>
      </details>
      {blocked.length > 0 && <ul>{blocked.map((item, index) => (
        <li key={item.start + item.end + index}>{item.start} – {item.end}{' '}
          <button className="calendar-button" type="button" disabled={busy} onClick={() => void change('blocked-intervals', false, item.start, item.end)}>Unblock</button>
        </li>
      ))}</ul>}
      {message && <p role="status">{message}</p>}
    </section>
  )
}
