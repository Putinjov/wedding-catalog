'use client'

import { Heart, Menu, Search, User } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const navItems = [
  { href: '/dresses', label: 'Dresses' },
  { href: '/rental', label: 'Rental' },
  { href: '/sale', label: 'Sale' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

const iconLinks = [
  { href: '/search', label: 'Search', icon: Search },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account', label: 'Account', icon: User, desktopOnly: true },
]

export function BoutiqueHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button aria-label="Open menu" size="icon" variant="ghost">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[18rem] bg-background" side="left">
              <SheetHeader>
                <SheetTitle className="font-serif text-2xl tracking-[0.16em]">WEDDING</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile navigation" className="mt-8 flex flex-col gap-1">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      className="rounded-sm px-1 py-3 text-lg text-foreground outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <Link
          className="font-serif text-2xl tracking-[0.18em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
        >
          WEDDING
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <Link
              className="text-sm uppercase tracking-[0.16em] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {iconLinks.map(({ desktopOnly, href, icon: Icon, label }) => (
            <Button
              asChild
              className={desktopOnly ? 'hidden lg:inline-flex' : undefined}
              key={href}
              size="icon"
              variant="ghost"
            >
              <Link aria-label={label} href={href}>
                <Icon className="size-5" aria-hidden="true" />
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </header>
  )
}
