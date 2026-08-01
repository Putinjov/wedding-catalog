'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { formatCurrency } from '@/config/site'
import { getCataloguePageURL, type CatalogueMode, type CatalogueSearchParams } from '@/lib/catalogue'
import type {
  CatalogueFilterOptions,
  CatalogueFilterValues,
} from '@/lib/catalogue-filters'

type RelationshipFilterName =
  | 'category'
  | 'colour'
  | 'designer'
  | 'fabric'
  | 'silhouette'

const filterGroups: {
  label: string
  name: RelationshipFilterName
  optionKey: keyof CatalogueFilterOptions
}[] = [
  { label: 'Category', name: 'category', optionKey: 'categories' },
  { label: 'Designer', name: 'designer', optionKey: 'designers' },
  { label: 'Silhouette', name: 'silhouette', optionKey: 'silhouettes' },
  { label: 'Fabric', name: 'fabric', optionKey: 'fabrics' },
  { label: 'Colour', name: 'colour', optionKey: 'colours' },
]

function CatalogueFilterFields({
  filters,
  idPrefix,
  mode,
  options,
  sort,
}: {
  filters: CatalogueFilterValues
  idPrefix: string
  mode: CatalogueMode
  options: CatalogueFilterOptions
  sort: string | undefined
}) {
  return (
    <form action={`/${mode}#catalogue-results`} className="space-y-7" method="get">
      {sort ? <input name="sort" type="hidden" value={sort} /> : null}

      {filterGroups.map((group) => (
        <fieldset className="space-y-2" key={group.name}>
          <legend className="font-serif text-lg text-foreground">{group.label}</legend>
          <div className="space-y-1">
            {options[group.optionKey].map((option) => (
              <label
                className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground"
                htmlFor={`${idPrefix}-${group.name}-${option.slug}`}
                key={option.id}
              >
                <input
                  className="size-4 accent-brand-deep-lavender"
                  defaultChecked={filters[group.name].includes(option.slug)}
                  id={`${idPrefix}-${group.name}-${option.slug}`}
                  name={group.name}
                  type="checkbox"
                  value={option.slug}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset>
        <legend className="font-serif text-lg text-foreground">Price</legend>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {mode === 'buy' ? 'Purchase price in euro' : 'Rental price in euro'}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm" htmlFor={`${idPrefix}-price-min`}>
              Minimum
            </label>
            <Input
              defaultValue={filters.priceMin ?? ''}
              id={`${idPrefix}-price-min`}
              inputMode="decimal"
              min="0"
              name="priceMin"
              placeholder="€"
              step="0.01"
              type="number"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm" htmlFor={`${idPrefix}-price-max`}>
              Maximum
            </label>
            <Input
              defaultValue={filters.priceMax ?? ''}
              id={`${idPrefix}-price-max`}
              inputMode="decimal"
              min="0"
              name="priceMax"
              placeholder="€"
              step="0.01"
              type="number"
            />
          </div>
        </div>
      </fieldset>

      <label
        className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-foreground"
        htmlFor={`${idPrefix}-featured`}
      >
        <input
          className="size-4 accent-brand-deep-lavender"
          defaultChecked={filters.featured}
          id={`${idPrefix}-featured`}
          name="featured"
          type="checkbox"
          value="1"
        />
        Featured dresses only
      </label>

      <Button className="min-h-11 w-full" type="submit">
        Show dresses
      </Button>
    </form>
  )
}

function removeFilterValue(
  searchParams: CatalogueSearchParams,
  name: string,
  value?: string,
): CatalogueSearchParams {
  const next: CatalogueSearchParams = { ...searchParams, page: undefined }
  if (value === undefined) return { ...next, [name]: undefined }

  const current = next[name]
  const remaining = (Array.isArray(current) ? current : current ? [current] : []).filter(
    (item) => item !== value,
  )
  return { ...next, [name]: remaining.length > 0 ? remaining : undefined }
}

export function CatalogueFilters({
  activeCount,
  children,
  filters,
  mode,
  options,
  searchParams,
}: {
  activeCount: number
  children: ReactNode
  filters: CatalogueFilterValues
  mode: CatalogueMode
  options: CatalogueFilterOptions
  searchParams: CatalogueSearchParams
}) {
  const chips: { label: string; name: string; value: string }[] = filterGroups.flatMap((group) =>
    options[group.optionKey]
      .filter((option) => filters[group.name].includes(option.slug))
      .map((option) => ({
        label: `${group.label}: ${option.label}`,
        name: group.name,
        value: option.slug,
      })),
  )

  if (filters.priceMin !== null) {
    chips.push({
      label: `From ${formatCurrency(filters.priceMin)}`,
      name: 'priceMin',
      value: String(filters.priceMin),
    })
  }
  if (filters.priceMax !== null) {
    chips.push({
      label: `Up to ${formatCurrency(filters.priceMax)}`,
      name: 'priceMax',
      value: String(filters.priceMax),
    })
  }
  if (filters.featured) {
    chips.push({ label: 'Featured', name: 'featured', value: '1' })
  }

  const clearSearchParams: CatalogueSearchParams = {
    sort: searchParams.sort,
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button className="min-h-11" variant="outline">
              <SlidersHorizontal aria-hidden="true" />
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
          </SheetTrigger>
          <SheetContent
            className="w-[min(90vw,24rem)] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] motion-reduce:transition-none motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none"
            side="left"
          >
            <SheetHeader className="pr-10 text-left">
              <SheetTitle className="font-serif text-2xl">Filter dresses</SheetTitle>
              <SheetDescription>
                Choose catalogue details. Every dress is individually fitted and altered.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-7">
              <CatalogueFilterFields
                filters={filters}
                idPrefix={`${mode}-mobile`}
                mode={mode}
                options={options}
                sort={typeof searchParams.sort === 'string' ? searchParams.sort : undefined}
              />
            </div>
          </SheetContent>
        </Sheet>

        {activeCount > 0 ? (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-medium text-brand-deep-lavender underline underline-offset-4"
            href={getCataloguePageURL({ mode, page: 1, searchParams: clearSearchParams })}
          >
            Clear all
          </Link>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <ul aria-label="Active filters" className="mt-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={`${chip.name}-${chip.value}`}>
              <Link
                aria-label={`Remove filter ${chip.label}`}
                className="inline-flex min-h-11 items-center gap-2 border border-border bg-secondary/55 px-3 text-sm text-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                href={getCataloguePageURL({
                  includeResultsAnchor: true,
                  mode,
                  page: 1,
                  searchParams: removeFilterValue(
                    searchParams,
                    chip.name,
                    filterGroups.some((group) => group.name === chip.name)
                      ? chip.value
                      : undefined,
                  ),
                })}
              >
                {chip.label}
                <X aria-hidden="true" className="size-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside aria-label="Catalogue filters" className="hidden lg:block">
          <div className="sticky top-28 border border-border bg-secondary/25 p-5">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl">Filter dresses</h2>
              {activeCount > 0 ? (
                <Link
                  className="text-sm font-medium text-brand-deep-lavender underline underline-offset-4"
                  href={getCataloguePageURL({ mode, page: 1, searchParams: clearSearchParams })}
                >
                  Clear all
                </Link>
              ) : null}
            </div>
            <CatalogueFilterFields
              filters={filters}
              idPrefix={`${mode}-desktop`}
              mode={mode}
              options={options}
              sort={typeof searchParams.sort === 'string' ? searchParams.sort : undefined}
            />
          </div>
        </aside>
        <div className="mt-6 min-w-0 lg:mt-0">{children}</div>
      </div>
    </>
  )
}
