import Image from 'next/image'
import Link from 'next/link'

import { SocialIcon } from '@/components/boutique/social-icon'
import { Separator } from '@/components/ui/separator'
import {
  publicBusinessAddressLines,
  publicBusinessMapUrl,
  publicBusinessPhone,
  publicBusinessPhoneDisplay,
  publicBusinessSocialProfiles,
} from '@/config/business'
import { privacyContactEmail } from '@/config/privacy'
import { siteConfig } from '@/config/site'

const footerGroups = [
  {
    title: 'Collection',
    links: [
      { href: '/dresses', label: 'All dresses' },
      { href: '/buy', label: 'Buy wedding dresses' },
      { href: '/rent', label: 'Rent wedding dresses' },
      { href: '/book-a-fitting', label: 'Book a fitting' },
    ],
  },
  {
    title: 'Information',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/contact', label: 'Contact' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms-and-conditions', label: 'Terms & Conditions' },
    ],
  },
]

const headingClassName = 'text-xs uppercase tracking-[0.24em] text-primary-foreground/75'
const linkClassName =
  'inline-flex min-h-11 items-center text-sm text-primary-foreground/80 outline-none transition-colors hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none'

export function BoutiqueFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-foreground text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr]">
          <div className="min-w-0">
            <div className="mb-5 w-24 bg-brand-ivory p-1.5">
              <Image
                alt={`${siteConfig.name} logo`}
                height={600}
                src="/brand/cait-bridal-logo.jpeg"
                width={600}
                sizes="96px"
              />
            </div>
            <Link
              className="inline-flex min-h-11 items-center font-serif text-2xl tracking-[0.04em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/"
            >
              {siteConfig.name}
            </Link>
            <p className="mt-2 max-w-xs text-sm leading-7 text-primary-foreground/75">
              {siteConfig.tagline}. Handpicked gowns available to buy or rent.
            </p>
            <nav aria-label="Social media" className="mt-5">
              <ul className="flex flex-wrap gap-3">
                {publicBusinessSocialProfiles.map((profile) => (
                  <li key={profile.label}>
                    <a
                      aria-label={`Visit ${siteConfig.name} on ${profile.label}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center border border-primary-foreground/25 text-primary-foreground/80 outline-none transition-colors hover:border-primary-foreground hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                      href={profile.url}
                      rel="me"
                      title={profile.label}
                    >
                      <SocialIcon platform={profile.label} />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {footerGroups.map((group) => (
            <nav aria-label={group.title} key={group.title}>
              <h2 className={headingClassName}>{group.title}</h2>
              <ul className="mt-4">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link className={linkClassName} href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <section aria-labelledby="footer-visit-heading" className="min-w-0">
            <h2 className={headingClassName} id="footer-visit-heading">
              Visit us
            </h2>
            <address className="mt-5 flex flex-col items-start text-sm not-italic leading-6 text-primary-foreground/80">
              <a
                aria-label={`View ${siteConfig.name} address on Google Maps`}
                className="inline-block outline-none transition-colors hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                href={publicBusinessMapUrl}
              >
                {publicBusinessAddressLines.map((line) => (
                  <span className="block" key={line}>
                    {line}
                  </span>
                ))}
              </a>
              <a
                className={`${linkClassName} mt-3 max-w-full break-all underline underline-offset-4`}
                href={`mailto:${privacyContactEmail}`}
              >
                {privacyContactEmail}
              </a>
              <a
                className={`${linkClassName} underline underline-offset-4`}
                href={`tel:${publicBusinessPhone}`}
              >
                {publicBusinessPhoneDisplay}
              </a>
            </address>
          </section>
        </div>

        <Separator className="my-8 bg-primary-foreground/15" />
        <p className="text-sm text-primary-foreground/75">
          &copy; {year} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
