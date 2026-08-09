import type { Metadata } from 'next'
import Link from 'next/link'

import { currentPrivacyPolicy, privacyContactEmail, privacyRetention } from '@/config/privacy'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  alternates: {
    canonical: currentPrivacyPolicy.policyPath,
  },
  description: `How ${siteConfig.name} uses and protects personal information for fitting bookings and payments.`,
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <main className="bg-background">
      <article className="container max-w-4xl py-16 md:py-24">
        <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">
          Privacy
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-none text-foreground sm:text-6xl">
          Privacy Policy
        </h1>
        <p className="mt-5 text-sm text-muted-foreground">
          Last updated: {currentPrivacyPolicy.lastUpdatedLabel}
        </p>

        <div className="prose prose-stone mt-12 max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-foreground prose-a:underline prose-a:underline-offset-4">
          <h2>How we use booking information</h2>
          <p>{currentPrivacyPolicy.noticeText}</p>
          <p>
            A fitting request can include your name, email address, phone number, appointment
            details, dress preference and optional notes. Please do not provide medical or other
            sensitive personal information in the notes field.
          </p>

          <h2>Our reasons for processing</h2>
          <p>
            We process booking information to take steps before entering into and performing our
            agreement with you, to meet legal and accounting obligations, and for legitimate
            interests such as security, fraud prevention and protecting legal claims. Marketing
            email requires a separate, optional consent.
          </p>

          <h2>Payments and Stripe</h2>
          <p>
            Stripe processes the fitting payment. We do not store card numbers, CVC values or full
            payment-method details. We retain only the Stripe identifiers, amount, currency,
            payment or refund status, and dates needed for operations and accounting. Stripe may
            retain some information independently to meet its own legal obligations.
          </p>

          <h2>Booking messages and marketing</h2>
          <p>
            Essential messages about a booking, payment or cancellation are not marketing. Email
            news and offers are optional, are never required to book, and require an affirmative
            opt-in. You can withdraw that consent at any time.
          </p>

          <h2>How long we keep information</h2>
          <ul>
            <li>
              Expired or abandoned unpaid bookings without a provided service: up to{' '}
              {privacyRetention.abandonedUnpaidDays} days after the last activity or failed payment.
            </li>
            <li>
              Cancelled appointments: up to {privacyRetention.cancelledMonths} months after the
              later of cancellation or the scheduled appointment.
            </li>
            <li>
              Full operational records for completed appointments: up to{' '}
              {privacyRetention.completedOperationalMonths} months after the appointment.
            </li>
            <li>
              Minimal contract, claim, payment and accounting records: up to{' '}
              {privacyRetention.minimumLegalRecordYears} years where legally or operationally
              required.
            </li>
            <li>Active email-marketing consent: until withdrawal or the programme ends.</li>
          </ul>
          <p>
            When the operational period ends, contact details, free-form notes and unnecessary
            operational fields are deleted or anonymised. Records subject to a legal retention
            requirement are restricted and are not used for marketing.
          </p>

          <h2>Your privacy requests</h2>
          <p>
            You may ask for access, a portable export, correction or deletion of your information
            or withdraw email marketing consent through our{' '}
            <Link href="/contact">contact page</Link> at{' '}
            <a href={`mailto:${privacyContactEmail}`}>{privacyContactEmail}</a>. We may need to
            verify your identity proportionately. We normally respond within one month. A complex
            request may take up to two additional months, and we will notify you within the first
            month if an extension is needed.
          </p>
          <p>
            Information that must be retained by law or for substantiated legal claims cannot
            always be deleted immediately. We will explain what was deleted, what must be retained,
            why it is retained, and when final deletion is expected.
          </p>
        </div>
      </article>
    </main>
  )
}
