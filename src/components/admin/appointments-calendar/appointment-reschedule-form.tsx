import type { FormEventHandler } from 'react'

import { ADMIN_NOTICE_OVERRIDE_WARNING } from '@/lib/booking/noticeRules'

export function AppointmentRescheduleForm({
  bounds,
  busy,
  buttonLabel,
  date,
  heading,
  onDateChange,
  onOverrideChange,
  onSubmit,
  onTimeChange,
  overrideNoticeRules,
  time,
  times,
}: {
  bounds: { maxDate: string; minDate: string }
  busy: boolean
  buttonLabel: string
  date: string
  heading: string
  onDateChange: (value: string) => void
  onOverrideChange: (value: boolean) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onTimeChange: (value: string) => void
  overrideNoticeRules: boolean
  time: string
  times: string[]
}) {
  return (
    <form className="appointment-reschedule" onSubmit={onSubmit}>
      <h4>{heading}</h4>
      <div className="new-appointment-form__row">
        <label>
          <span>Date</span>
          <input
            max={bounds.maxDate}
            min={bounds.minDate}
            onChange={(event) => onDateChange(event.target.value)}
            required
            type="date"
            value={date}
          />
        </label>
        <label>
          <span>Time</span>
          <select
            onChange={(event) => onTimeChange(event.target.value)}
            required
            value={time}
          >
            <option disabled value="">Choose time</option>
            {times.map((slotTime) => <option key={slotTime} value={slotTime}>{slotTime}</option>)}
          </select>
        </label>
      </div>
      <label className="appointment-reschedule__override">
        <input
          checked={overrideNoticeRules}
          onChange={(event) => onOverrideChange(event.target.checked)}
          type="checkbox"
        />
        <span>Override minimum notice and next-day cutoff</span>
      </label>
      {overrideNoticeRules ? <p className="calendar-warning">{ADMIN_NOTICE_OVERRIDE_WARNING}</p> : null}
      <button
        className="calendar-button calendar-button--primary"
        disabled={busy || !date || !time}
        type="submit"
      >
        {buttonLabel}
      </button>
    </form>
  )
}
