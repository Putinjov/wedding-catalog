import { describe, expect, it } from 'vitest'

import { isExpoPushToken } from '@/collections/MobileDevices'
import { parseCalendarRange } from '@/lib/admin/appointments/getCalendarAppointments'
import {
  buildAppointmentPushMessage,
  getAppointmentPushEvent,
} from '@/lib/notifications/appointmentPush'
import type { Appointment } from '@/payload-types'

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    createdAt: '2026-09-12T10:00:00.000Z',
    currency: 'EUR',
    customerName: 'Private Customer',
    email: 'private@example.test',
    endAt: '2026-09-19T11:30:00.000Z',
    fittingFee: 20,
    id: 'appointment-1',
    needsAdminReview: false,
    paymentStatus: 'unpaid',
    phone: '+353870000000',
    publicReference: `fit_${'a'.repeat(32)}`,
    purpose: 'undecided',
    source: 'website',
    startAt: '2026-09-19T10:00:00.000Z',
    status: 'pending_payment',
    updatedAt: '2026-09-12T10:00:00.000Z',
    ...overrides,
  }
}

describe('manager app push events', () => {
  it('notifies for a new website booking but not a staff-created booking', () => {
    expect(
      getAppointmentPushEvent({ appointment: appointment(), operation: 'create' }),
    ).toBe('new_appointment')
    expect(
      getAppointmentPushEvent({
        appointment: appointment({ source: 'admin' }),
        operation: 'create',
      }),
    ).toBeNull()
  })

  it('prioritises review and schedule changes over routine status updates', () => {
    const previous = appointment()
    expect(
      getAppointmentPushEvent({
        appointment: appointment({ needsAdminReview: true, status: 'payment_received_conflict' }),
        operation: 'update',
        previous,
      }),
    ).toBe('admin_review')
    expect(
      getAppointmentPushEvent({
        appointment: appointment({
          endAt: '2026-09-20T11:30:00.000Z',
          startAt: '2026-09-20T10:00:00.000Z',
        }),
        operation: 'update',
        previous,
      }),
    ).toBe('rescheduled')
  })

  it.each([
    ['confirmed', 'confirmed'],
    ['cancelled', 'cancelled'],
  ] as const)('emits a %s event when the lifecycle status changes', (status, event) => {
    expect(
      getAppointmentPushEvent({
        appointment: appointment({ status }),
        operation: 'update',
        previous: appointment(),
      }),
    ).toBe(event)
  })

  it('ignores unrelated appointment edits', () => {
    expect(
      getAppointmentPushEvent({
        appointment: appointment({ internalNotes: 'Staff-only note' }),
        operation: 'update',
        previous: appointment(),
      }),
    ).toBeNull()
  })

  it('keeps customer details out of lock-screen copy', () => {
    const message = buildAppointmentPushMessage({
      appointmentId: 'appointment-1',
      event: 'new_appointment',
      token: 'ExpoPushToken[valid_token-123]',
    })
    expect(message.data.url).toBe('/appointment/appointment-1')
    expect(message.badge).toBe(1)
    expect(message.channelId).toBe('appointments')
    expect(JSON.stringify(message)).not.toContain('Private Customer')
    expect(JSON.stringify(message)).not.toContain('private@example.test')
    expect(JSON.stringify(message)).not.toContain('+353870000000')
  })

  it('accepts only Expo-formatted device tokens', () => {
    expect(isExpoPushToken('ExpoPushToken[valid_token-123]')).toBe(true)
    expect(isExpoPushToken('ExponentPushToken[legacy_token_123]')).toBe(true)
    expect(isExpoPushToken('not-a-push-token')).toBe(false)
  })
})

describe('mobile calendar date ranges', () => {
  it('treats date-only boundaries as Europe/Dublin midnights during summer time', () => {
    const range = parseCalendarRange('2026-09-12', '2026-09-13')
    expect(range.from.toISOString()).toBe('2026-09-11T23:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-09-12T23:00:00.000Z')
  })

  it('treats date-only boundaries as Europe/Dublin midnights during winter time', () => {
    const range = parseCalendarRange('2026-12-12', '2026-12-13')
    expect(range.from.toISOString()).toBe('2026-12-12T00:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-12-13T00:00:00.000Z')
  })
})
