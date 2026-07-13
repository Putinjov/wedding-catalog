'use client'

import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NewsletterSection() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // TODO: Integrate newsletter signup with a real backend endpoint.
  }

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Journal notes</p>
          <h2 className="mt-3 font-serif text-4xl text-foreground md:text-5xl">Stay inspired</h2>
        </div>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="newsletter-email">
            Email address
          </label>
          <Input
            className="h-12 rounded-sm border-border bg-secondary/35 px-4"
            id="newsletter-email"
            placeholder="Email address"
            type="email"
          />
          <Button className="h-12 rounded-sm px-6" type="submit">
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  )
}
