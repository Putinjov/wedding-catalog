import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppointmentDrawer } from '@/components/admin/appointments-calendar/appointment-drawer'
import { AppointmentHistoryPanel } from '@/components/admin/appointments-calendar/appointment-history'
import { defaultBookingSettings } from '@/config/booking'
import type { AppointmentDetail } from '@/lib/admin/appointments/calendarTypes'

function detail(overrides: Partial<AppointmentDetail> = {}): AppointmentDetail {
  return {
    amountPaid: 2000,
    capabilities: {
      canEditInternalNotes: true,
      canRefundPaidConflict: true,
      canReschedule: true,
      canResendConfirmation: true,
      canViewAuditTrail: true,
      canViewEmailHistory: true,
    },
    currency: 'EUR',
    customerName: 'Test Customer',
    dress: null,
    email: 'customer@example.test',
    endAt: '2026-10-27T11:00:00.000Z',
    fittingFee: 20,
    history: {
      audits: [
        {
          action: 'appointment.payment_changed',
          actorLabel: 'Owner',
          actorType: 'user',
          id: 'audit-1',
          newStatus: 'confirmed',
          paymentStatus: 'paid',
          previousPaymentStatus: 'processing',
          previousStatus: 'payment_processing',
          timestamp: '2026-08-01T10:00:00.000Z',
        },
      ],
      emails: [
        {
          attempts: 1,
          createdAt: '2026-08-01T10:00:00.000Z',
          event: 'confirmed',
          id: 'delivery-1',
          status: 'sent',
          trigger: 'manual',
        },
      ],
    },
    id: 'appointment-1',
    internalNotes: 'Prepare alteration options.',
    needsAdminReview: false,
    notes: 'Customer prefers a quiet appointment.',
    paymentStatus: 'paid',
    phone: '+353100000000',
    publicReference: 'SAFE-REFERENCE',
    purpose: 'undecided',
    source: 'website',
    startAt: '2026-10-27T10:00:00.000Z',
    status: 'confirmed',
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('appointment admin drawer', () => {
  it('shows state-aware actions, undecided intent, notes, and sanitised history', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ appointment: detail() }),
        ok: true,
      })),
    )

    render(
      <AppointmentDrawer
        appointmentId="appointment-1"
        onChanged={async () => undefined}
        onClose={() => undefined}
        settings={defaultBookingSettings}
      />,
    )

    expect(await screen.findByText('Test Customer')).not.toBeNull()
    expect(screen.getByText('Undecided')).not.toBeNull()
    expect(screen.getByRole('link', { name: /email customer/i }).getAttribute('href')).toBe(
      'mailto:customer@example.test',
    )
    expect(screen.getByRole('link', { name: /call customer/i }).getAttribute('href')).toBe(
      'tel:+353100000000',
    )
    expect(
      (screen.getByRole('textbox', { name: /internal notes/i }) as HTMLTextAreaElement).value,
    ).toBe('Prepare alteration options.')
    expect(screen.getByRole('button', { name: /save internal notes/i })).not.toBeNull()
    expect(screen.getByRole('heading', { name: /reschedule appointment/i })).not.toBeNull()
    expect(screen.getByText('History and audit trail')).not.toBeNull()
    expect(screen.getByText('Status history')).not.toBeNull()
    expect(screen.getByText('Payment history')).not.toBeNull()
    expect(screen.getByText('Email delivery history')).not.toBeNull()
    expect(screen.queryByText(/technical payment details/i)).toBeNull()
  })

  it('hides restricted history when the backend capability is absent', () => {
    render(
      <AppointmentHistoryPanel
        detail={detail({
          capabilities: {
            canEditInternalNotes: true,
            canRefundPaidConflict: false,
            canReschedule: true,
            canResendConfirmation: true,
            canViewAuditTrail: false,
            canViewEmailHistory: false,
          },
          history: { audits: [], emails: [] },
        })}
      />,
    )

    expect(screen.queryByText('History and audit trail')).toBeNull()
  })
})
