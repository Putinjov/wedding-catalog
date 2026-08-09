import { describe, expect, it } from 'vitest'

import { defaultBookingSettings, type ResolvedBookingSettings } from '@/config/booking'
import {
  adminBookingRulesContext,
  assertAppointmentScheduleRules,
} from '@/lib/booking/appointmentBookingRules'
import type { Appointment } from '@/payload-types'

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appointment-1',
    publicReference: 'fit_0123456789abcdef0123456789abcdef',
    purpose: 'buy',
    customerName: 'Customer',
    email: 'customer@example.com',
    phone: '+353100000000',
    startAt: '2026-07-21T09:00:00.000Z',
    endAt: '2026-07-21T10:00:00.000Z',
    status: 'pending_payment',
    paymentStatus: 'unpaid',
    fittingFee: 20,
    currency: 'EUR',
    source: 'website',
    updatedAt: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function settings(
  overrides: Partial<ResolvedBookingSettings>,
): ResolvedBookingSettings {
  return { ...defaultBookingSettings, ...overrides }
}

describe('final appointment booking-rule validation', () => {
  it('blocks a direct create inside the minimum-notice boundary', () => {
    expect(() =>
      assertAppointmentScheduleRules({
        data: appointment(),
        now: new Date('2026-07-20T10:00:00.000Z'),
        operation: 'create',
        settings: settings({ minimumNoticeHours: 24 }),
      }),
    ).toThrow(/at least 24 hours' notice/i)
  })

  it('allows the exact minimum-notice boundary', () => {
    expect(() =>
      assertAppointmentScheduleRules({
        data: appointment(),
        now: new Date('2026-07-20T09:00:00.000Z'),
        operation: 'create',
        settings: settings({ minimumNoticeHours: 24 }),
      }),
    ).not.toThrow()
  })

  it('accepts only the trusted admin context as a notice override', () => {
    const input = {
      data: appointment({ source: 'admin' }),
      now: new Date('2026-07-20T10:00:00.000Z'),
      operation: 'create' as const,
      settings: settings({ minimumNoticeHours: 24 }),
    }

    expect(() =>
      assertAppointmentScheduleRules({
        ...input,
        context: {
          appointmentBookingRules: { allowNoticeOverride: true, origin: 'public' },
        },
      }),
    ).toThrow(/at least 24 hours' notice/i)
    expect(() =>
      assertAppointmentScheduleRules({
        ...input,
        context: adminBookingRulesContext(true),
      }),
    ).not.toThrow()
  })

  it('keeps closed dates and blocked intervals enforced during an admin notice override', () => {
    expect(() =>
      assertAppointmentScheduleRules({
        context: adminBookingRulesContext(true),
        data: appointment({ source: 'admin' }),
        now: new Date('2026-07-20T10:00:00.000Z'),
        operation: 'create',
        settings: settings({
          blockedIntervals: [{ date: '2026-07-21', end: '11:00', start: '10:00' }],
          minimumNoticeHours: 24,
        }),
      }),
    ).toThrow(/future configured fitting time/i)

    expect(() =>
      assertAppointmentScheduleRules({
        context: adminBookingRulesContext(true),
        data: appointment({ source: 'admin' }),
        now: new Date('2026-07-20T10:00:00.000Z'),
        operation: 'create',
        settings: settings({ closedWeekdays: [0, 1, 2], minimumNoticeHours: 24 }),
      }),
    ).toThrow(/future configured fitting time/i)
  })

  it('does not retroactively reapply notice rules to a non-schedule update', () => {
    expect(() =>
      assertAppointmentScheduleRules({
        data: { status: 'confirmed' },
        now: new Date('2026-07-20T10:00:00.000Z'),
        operation: 'update',
        originalDoc: appointment(),
        settings: settings({ minimumNoticeHours: 24 }),
      }),
    ).not.toThrow()
  })
})
