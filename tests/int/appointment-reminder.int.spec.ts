import { describe, expect, it } from 'vitest'

import {
  getAppointmentReminderKey,
  getDayBeforeReminderWindow,
  isDayBeforeReminderDue,
} from '@/lib/notifications/appointmentReminder'

describe('day-before appointment reminders in Europe/Dublin', () => {
  it('uses a 23-hour local date across the spring DST boundary', () => {
    expect(getDayBeforeReminderWindow(new Date('2026-03-28T10:00:00Z'))).toEqual({
      startAt: '2026-03-29T00:00:00.000Z',
      endAt: '2026-03-29T23:00:00.000Z',
    })
  })

  it('uses a 25-hour local date across the autumn DST boundary', () => {
    expect(getDayBeforeReminderWindow(new Date('2026-10-24T10:00:00Z'))).toEqual({
      startAt: '2026-10-24T23:00:00.000Z',
      endAt: '2026-10-26T00:00:00.000Z',
    })
  })

  it('requires a confirmed appointment on the next Dublin calendar date', () => {
    const now = new Date('2026-03-28T10:00:00Z')
    const appointment = { startAt: '2026-03-29T09:00:00.000Z', status: 'confirmed' as const }

    expect(isDayBeforeReminderDue(appointment, now)).toBe(true)
    expect(isDayBeforeReminderDue({ ...appointment, status: 'cancelled' }, now)).toBe(false)
    expect(
      isDayBeforeReminderDue({ ...appointment, startAt: '2026-03-30T09:00:00.000Z' }, now),
    ).toBe(false)
    expect(isDayBeforeReminderDue({ ...appointment, startAt: 'invalid' }, now)).toBe(false)
  })

  it('keys delivery to the exact scheduled start so a moved slot cannot use an old reminder', () => {
    expect(
      getAppointmentReminderKey({ id: 'appointment-1', startAt: '2030-06-10T10:00:00.000Z' }),
    ).toBe('appointment-email:appointment-1:reminder:2030-06-10T10:00:00.000Z')
  })
})
