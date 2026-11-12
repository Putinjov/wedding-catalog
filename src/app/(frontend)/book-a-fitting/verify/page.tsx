import type { Metadata } from 'next'

import { EmailVerificationPage } from '@/components/booking/email-verification-page'
import { privatePageRobots } from '@/config/indexation'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = { robots: privatePageRobots, title: 'Confirm your email' }

export default function VerifyBookingEmailPage() {
  return <EmailVerificationPage />
}
