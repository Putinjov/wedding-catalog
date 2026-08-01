import { Button } from '@/components/ui/button'
import {
  catalogueSortOptions,
  type CatalogueMode,
  type CatalogueSearchParams,
  type CatalogueSort,
} from '@/lib/catalogue'

export function CatalogueSortControl({
  mode,
  searchParams,
  sort,
}: {
  mode: CatalogueMode
  searchParams: CatalogueSearchParams
  sort: CatalogueSort
}) {
  const preservedParameters = Object.entries(searchParams).flatMap(([name, value]) => {
    if (name === 'page' || name === 'sort' || value === undefined) return []
    return (Array.isArray(value) ? value : [value]).map((item) => ({ name, value: item }))
  })

  return (
    <form action={`/${mode}#catalogue-results`} className="flex items-end gap-3" method="get">
      {preservedParameters.map(({ name, value }, index) => (
        <input key={`${name}-${index}`} name={name} type="hidden" value={value} />
      ))}

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor={`${mode}-catalogue-sort`}>
          Sort by
        </label>
        <select
          className="min-h-11 border border-input bg-background px-3 text-sm outline-none focus-visible:ring-4 focus-visible:ring-ring/10"
          defaultValue={sort}
          id={`${mode}-catalogue-sort`}
          name="sort"
        >
          {catalogueSortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Button className="min-h-11" type="submit" variant="outline">
        Apply
      </Button>
    </form>
  )
}
