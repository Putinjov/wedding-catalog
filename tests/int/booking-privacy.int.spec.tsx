import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ContactPage from '@/app/(frontend)/contact/page'
import PrivacyPage from '@/app/(frontend)/privacy/page'
import {
  currentPrivacyPolicy,
  privacyContactEmail,
  privacyPolicySnapshots,
} from '@/config/privacy'
import {
  appointmentPrivacyContext,
  assertAppointmentPrivacyFields,
  currentPrivacyHashes,
  hashPrivacyText,
} from '@/lib/booking/privacyIntegrity'
import { bookingSchema } from '@/lib/booking/validation'
import type { Appointment } from '@/payload-types'

function publicPrivacyRecord(
  overrides: Partial<Appointment> = {},
): Partial<Appointment> {
  return {
    source: 'website',
    privacyAcknowledgedAt: '2026-08-09T12:00:00.000Z',
    privacyAcknowledgementSource: 'website',
    privacyAcknowledgementTextHash: currentPrivacyHashes.acknowledgement,
    privacyNoticeMethod: 'website',
    privacyNoticeProvidedAt: '2026-08-09T12:00:00.000Z',
    privacyNoticeTextHash: currentPrivacyHashes.notice,
    privacyPolicyVersion: currentPrivacyPolicy.version,
    marketingConsentStatus: 'not_granted',
    ...overrides,
  }
}

describe('booking privacy and consent', () => {
  it('requires acknowledgement server-side while keeping marketing optional', () => {
    const input = {
      customerName: 'Customer',
      date: '2099-01-02',
      email: 'customer@example.com',
      phone: '+353100000000',
      purpose: 'buy',
      time: '10:00',
    }

    const missingAcknowledgement = bookingSchema.safeParse(input)
    expect(missingAcknowledgement.success).toBe(false)
    if (!missingAcknowledgement.success) {
      expect(missingAcknowledgement.error.flatten().fieldErrors.privacyAcknowledged).toContain(
        'Please confirm that you have read the Privacy Policy.',
      )
    }

    const accepted = bookingSchema.parse({ ...input, privacyAcknowledged: true })
    expect(accepted.marketingEmailOptIn).toBe(false)
  })

  it('records only trusted current policy evidence for website bookings', () => {
    expect(() =>
      assertAppointmentPrivacyFields({
        context: appointmentPrivacyContext('public-booking'),
        data: publicPrivacyRecord(),
        operation: 'create',
      }),
    ).not.toThrow()

    expect(() =>
      assertAppointmentPrivacyFields({
        data: publicPrivacyRecord(),
        operation: 'create',
      }),
    ).toThrow(/server-controlled/i)

    expect(() =>
      assertAppointmentPrivacyFields({
        context: appointmentPrivacyContext('public-booking'),
        data: publicPrivacyRecord({ privacyPolicyVersion: 'old-version' }),
        operation: 'create',
      }),
    ).toThrow(/current privacy notice/i)
  })

  it('requires complete evidence only when email marketing is granted', () => {
    expect(() =>
      assertAppointmentPrivacyFields({
        context: appointmentPrivacyContext('public-booking'),
        data: publicPrivacyRecord({
          marketingConsentAt: '2026-08-09T12:00:00.000Z',
          marketingConsentCaptureMethod: 'written',
          marketingConsentChannel: 'email',
          marketingConsentStatus: 'granted',
          marketingConsentTextHash: currentPrivacyHashes.marketingEmailOptIn,
        }),
        operation: 'create',
      }),
    ).not.toThrow()

    expect(() =>
      assertAppointmentPrivacyFields({
        context: appointmentPrivacyContext('public-booking'),
        data: publicPrivacyRecord({ marketingConsentStatus: 'granted' }),
        operation: 'create',
      }),
    ).toThrow(/marketing consent evidence is incomplete/i)
  })

  it('does not fabricate acknowledgement or marketing consent for admin bookings', () => {
    const adminRecord: Partial<Appointment> = {
      source: 'admin',
      privacyNoticeMethod: 'phone',
      privacyNoticeProvidedAt: '2026-08-09T12:00:00.000Z',
      privacyNoticeTextHash: currentPrivacyHashes.notice,
      privacyPolicyVersion: currentPrivacyPolicy.version,
      marketingConsentStatus: 'not_asked',
    }

    expect(() =>
      assertAppointmentPrivacyFields({
        context: appointmentPrivacyContext('admin-create'),
        data: adminRecord,
        operation: 'create',
      }),
    ).not.toThrow()

    expect(() =>
      assertAppointmentPrivacyFields({
        context: appointmentPrivacyContext('admin-create'),
        data: { ...adminRecord, privacyAcknowledgedAt: '2026-08-09T12:00:00.000Z' },
        operation: 'create',
      }),
    ).toThrow(/without fabricating acknowledgement/i)
  })

  it('keeps versioned copy auditable and exposes a canonical public policy', () => {
    expect(new Set(privacyPolicySnapshots.map((snapshot) => snapshot.version)).size).toBe(
      privacyPolicySnapshots.length,
    )
    expect(hashPrivacyText(currentPrivacyPolicy.noticeText)).toBe(currentPrivacyHashes.notice)

    const markup = renderToStaticMarkup(<PrivacyPage />)
    expect(markup).toContain('Privacy Policy')
    expect(markup).toContain('Last updated: 9 August 2026')
    expect(markup).toContain('href="/contact"')
    expect(markup).toContain(privacyContactEmail)
  })

  it('publishes a real privacy contact and a manual marketing withdrawal route', () => {
    const markup = renderToStaticMarkup(<ContactPage />)

    expect(markup).toContain(`mailto:${privacyContactEmail}`)
    expect(markup).toContain('Privacy request')
    expect(markup).toContain('Marketing withdrawal')
    expect(markup).toContain('currently process withdrawal requests manually')
    expect(markup).toContain('href="/privacy"')
  })
})
