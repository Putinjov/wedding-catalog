import Image from 'next/image'
import Link from 'next/link'

import { Separator } from '@/components/ui/separator'
import { siteConfig } from '@/config/site'

const footerGroups = [
  {
    title: 'Shop',
    links: [
      { href: '/buy', label: 'Buy wedding dresses' },
      { href: '/rent', label: 'Rent wedding dresses' },
      { href: '/dresses', label: 'Dresses' },
    ],
  },
  {
    title: 'Information',
    links: [
      { href: '/book-a-fitting', label: 'Book a fitting' },
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: `${siteConfig.name} edit`,
    links: [
      { href: '/book-a-fitting', label: 'Private fittings' },
      { href: '/rent', label: 'Flexible rental' },
      { href: '/dresses', label: 'Handpicked dresses' },
    ],
  },
]

export function BoutiqueFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-foreground text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1.85fr]">
          <div className="flex gap-5 sm:gap-7">
            <div className="w-28 shrink-0 self-start bg-brand-ivory p-1.5 sm:w-36">
              {/* TODO: Replace the temporary raster logo with a transparent production SVG or PNG. */}
              <Image
                alt={`${siteConfig.name} logo`}
                height={600}
                src="/brand/cait-bridal-logo.jpeg"
                width={600}
              />
            </div>
            <div>
              <Link className="font-serif text-2xl tracking-[0.04em] outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/">
                {siteConfig.name}
              </Link>
              <p className="mt-3 max-w-sm text-sm leading-7 text-primary-foreground/75">
                {siteConfig.tagline}. Handpicked gowns available to buy or rent.
              </p>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <nav aria-label={group.title} key={group.title}>
                <h2 className="text-xs uppercase tracking-[0.24em] text-primary-foreground/55">
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        className="text-sm text-primary-foreground/78 outline-none transition-colors hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <Separator className="my-8 bg-primary-foreground/15" />

        <p className="text-sm text-primary-foreground/55">
          &copy; {year} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
