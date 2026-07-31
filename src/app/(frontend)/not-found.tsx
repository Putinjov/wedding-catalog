import Link from 'next/link'
import React from 'react'

import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="container flex min-h-[65vh] items-center py-20 md:py-28">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.24em] text-brand-deep-lavender">
          Page not found
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-tight text-foreground md:text-7xl">
          This page is no longer in our collection.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
          The address may have changed, or the page may no longer be available. Continue
          browsing our wedding dresses or return home.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link className={buttonVariants({ size: 'lg' })} href="/dresses">
            Browse dresses
          </Link>
          <Link className={buttonVariants({ size: 'lg', variant: 'outline' })} href="/">
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
