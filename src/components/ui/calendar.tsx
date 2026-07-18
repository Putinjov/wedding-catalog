'use client'

import type * as React from 'react'
import { DayPicker } from 'react-day-picker'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utilities/ui'

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn('w-full select-none', className)}
      classNames={{
        root: 'w-full',
        months: 'relative flex w-full flex-col',
        month: 'w-full space-y-4',
        month_caption: 'flex h-11 items-center justify-center px-12',
        caption_label: 'font-serif text-xl font-medium text-foreground',
        nav: 'absolute inset-x-0 top-0 flex h-11 items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'size-11 rounded-sm p-0 text-brand-deep-lavender',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'size-11 rounded-sm p-0 text-brand-deep-lavender',
        ),
        chevron: 'size-5 fill-current',
        month_grid: 'w-full table-fixed border-collapse',
        weekdays: 'border-b border-brand-warm-border',
        weekday: 'h-10 text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground',
        week: 'w-full',
        day: 'relative h-12 p-0 text-center align-middle',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'mx-auto size-11 rounded-sm p-0 text-base font-normal hover:bg-brand-soft-lavender/35',
        ),
        selected: '[&>button]:bg-brand-deep-lavender [&>button]:text-white [&>button]:hover:bg-brand-deep-lavender',
        today: '[&>button]:border [&>button]:border-brand-antique-gold [&>button]:font-semibold',
        outside: 'text-muted-foreground/45',
        disabled:
          '[&>button]:cursor-not-allowed [&>button]:bg-secondary/70 [&>button]:text-muted-foreground [&>button]:line-through [&>button]:opacity-100',
        focused: '[&>button]:ring-2 [&>button]:ring-brand-deep-lavender [&>button]:ring-offset-2',
        ...classNames,
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  )
}
