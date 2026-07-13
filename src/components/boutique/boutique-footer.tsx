import Link from 'next/link'

import { Separator } from '@/components/ui/separator'

const footerGroups = [
  {
    title: 'Shop',
    links: [
      { href: '/dresses', label: 'Dresses' },
      { href: '/rental', label: 'Rental' },
      { href: '/sale', label: 'Sale' },
    ],
  },
  {
    title: 'Information',
    links: [
      { href: '/about', label: 'About' },
      { href: '/book-a-fitting', label: 'Book a fitting' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Customer care',
    links: [
      { href: '/delivery', label: 'Delivery' },
      { href: '/returns', label: 'Returns' },
      { href: '/care', label: 'Dress care' },
    ],
  },
]

export function BoutiqueFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-foreground text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1.85fr]">
          <div>
            <Link className="font-serif text-2xl tracking-[0.18em] outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/">
              WEDDING
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-primary-foreground/75">
              A quiet bridal catalogue for handpicked gowns available to buy or rent.
            </p>
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
          &copy; {year} WEDDING. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
