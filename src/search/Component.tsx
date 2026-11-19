'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'

export const Search = ({ query = '' }: { query?: string }) => {
  const router = useRouter()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get('q') ?? '').trim().slice(0, 120)
    if (value === query) return

    const params = new URLSearchParams()
    if (value) params.set('q', value)
    router.push(value ? `/search?${params.toString()}` : '/search')
  }

  return (
    <form action="/search" method="get" onSubmit={submit} className="flex gap-2">
      <Label htmlFor="search" className="sr-only">
        Search
      </Label>
      <Input id="search" name="q" defaultValue={query} maxLength={120} placeholder="Search" />
      <Button type="submit">Search</Button>
    </form>
  )
}
