import type { Metadata } from 'next'
import Link from 'next/link'

import {
  privacyContactEmail,
  privacyContactPath,
  privacyPolicyPath,
} from '@/config/privacy'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  alternates: {
    canonical: privacyContactPath,
  },
  description: `Contact ${siteConfig.name} about fittings, dresses or a privacy request.`,
  title: 'Contact',
}

const generalContactHref = `mailto:${privacyContactEmail}`
const privacyRequestHref = `mailto:${privacyContactEmail}?subject=Privacy%20request`
const marketingWithdrawalHref = `mailto:${privacyContactEmail}?subject=Marketing%20withdrawal`
const contactLinkClassName =
  'inline-flex min-h-11 items-center text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function ContactPage() {
  return (
    <main className="bg-background">
      <article className="container max-w-4xl py-16 md:py-24">
        <p className="text-xs uppercase tracking-[0.28em] text-brand-deep-lavender">Contact</p>
        <h1 className="mt-4 font-serif text-5xl leading-none text-foreground sm:text-6xl">
          Get in touch
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          For dress, fitting and general enquiries, email us at{' '}
          <a
            className={`${contactLinkClassName} font-medium`}
            href={generalContactHref}
          >
            {privacyContactEmail}
          </a>
          .
        </p>

        <div className="prose prose-stone mt-12 max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-foreground prose-a:underline prose-a:underline-offset-4">
          <h2>Privacy requests</h2>
          <p>
            This is also our public privacy contact. You can ask for access, a portable export,
            correction or deletion of your personal information by emailing{' '}
            <a className={contactLinkClassName} href={privacyRequestHref}>
              {privacyContactEmail}
            </a>
            . Use “Privacy request” as the subject. We may need to verify your identity
            proportionately before acting on a request. Read our{' '}
            <Link className={contactLinkClassName} href={privacyPolicyPath}>
              Privacy Policy
            </Link>{' '}
            for more details.
          </p>
          <p>
            Please do not send medical information, payment card details or other sensitive
            personal information by email.
          </p>

          <h2>Withdraw email marketing consent</h2>
          <p>
            To stop optional marketing emails, send a request to{' '}
            <a className={contactLinkClassName} href={marketingWithdrawalHref}>
              {privacyContactEmail}
            </a>{' '}
            with “Marketing withdrawal” as the subject. We currently process withdrawal requests
            manually. Essential messages about an existing booking, payment or cancellation are
            not marketing and may still be sent when needed.
          </p>
        </div>
      </article>
    </main>
  )
}
