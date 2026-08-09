export const privacyPolicyPath = '/privacy'
export const privacyContactPath = '/contact'
export const privacyContactEmail = 'sales@caitbridal.ie'

export const privacyPolicySnapshots = [
  {
    acknowledgementText:
      'I confirm that I have read the Privacy Policy and understand how my personal data will be used to manage my booking.',
    lastUpdated: '2026-08-09',
    lastUpdatedLabel: '9 August 2026',
    marketingEmailOptInText:
      'Yes, I would like to receive occasional news and offers by email. I can unsubscribe at any time.',
    noticeText:
      'We use the information you provide to manage your booking, process payment, send essential booking messages, prevent fraud, and comply with legal and accounting obligations. Payments are processed by Stripe. For more information, see our Privacy Policy.',
    policyPath: privacyPolicyPath,
    version: '2026-08-09',
  },
] as const

export const currentPrivacyPolicy = privacyPolicySnapshots.at(-1)!

export const privacyRetention = {
  abandonedUnpaidDays: 30,
  backupMaximumDays: 35,
  cancelledMonths: 12,
  completedOperationalMonths: 24,
  minimumLegalRecordYears: 6,
  standardRequestResponseMonths: 1,
} as const

export const privacyNoticeMethodValues = [
  'website',
  'phone',
  'email',
  'sms',
  'in_person',
] as const

export const adminPrivacyNoticeMethodValues = [
  'phone',
  'email',
  'sms',
  'in_person',
] as const

export const marketingConsentStatusValues = [
  'not_asked',
  'not_granted',
  'granted',
  'withdrawn',
] as const

export type AdminPrivacyNoticeMethod = (typeof adminPrivacyNoticeMethodValues)[number]
export type MarketingConsentStatus = (typeof marketingConsentStatusValues)[number]
export type PrivacyNoticeMethod = (typeof privacyNoticeMethodValues)[number]
