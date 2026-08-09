import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NewAppointmentDialog } from '@/components/admin/appointments-calendar/new-appointment-dialog'
import { defaultBookingSettings } from '@/config/booking'
import { createAdminAppointmentSchema } from '@/lib/admin/appointments/createAdminAppointment'
import { ADMIN_NOTICE_OVERRIDE_WARNING } from '@/lib/booking/noticeRules'

describe('admin booking notice override', () => {
  it('is explicit, labelled, and separate from the payment-status override', () => {
    render(
      <NewAppointmentDialog
        dresses={[]}
        onCreated={async () => undefined}
        onOpenChange={() => undefined}
        open
        settings={defaultBookingSettings}
      />,
    )

    const override = screen.getByRole('checkbox', {
      name: /override minimum notice and next-day cutoff/i,
    })
    expect((override as HTMLInputElement).checked).toBe(false)
    expect(screen.queryByText(ADMIN_NOTICE_OVERRIDE_WARNING)).toBeNull()

    fireEvent.click(override)

    expect((override as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText(ADMIN_NOTICE_OVERRIDE_WARNING)).not.toBeNull()
  })

  it('accepts only a boolean override flag in the admin endpoint schema', () => {
    const base = {
      customerName: 'Customer',
      date: '2026-07-21',
      email: 'customer@example.com',
      initialStatus: 'pending',
      phone: '+353100000000',
      privacyNoticeMethod: 'phone',
      purpose: 'buy',
      time: '10:00',
    }

    expect(createAdminAppointmentSchema.safeParse({ ...base, overrideNoticeRules: true }).success).toBe(
      true,
    )
    expect(
      createAdminAppointmentSchema.safeParse({ ...base, overrideNoticeRules: 'true' }).success,
    ).toBe(false)
  })
})
