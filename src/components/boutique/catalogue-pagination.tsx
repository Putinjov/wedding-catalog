import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  getCataloguePageURL,
  type CatalogueMode,
  type CatalogueSearchParams,
} from '@/lib/catalogue'

export function CataloguePagination({
  mode,
  page,
  searchParams,
  totalPages,
}: {
  mode: CatalogueMode
  page: number
  searchParams: CatalogueSearchParams
  totalPages: number
}) {
  if (totalPages <= 1) return null

  const hasPreviousPage = page > 1
  const hasNextPage = page < totalPages

  return (
    <nav aria-label="Catalogue pagination" className="mt-10 flex items-center justify-between gap-4">
      <div>
        {hasPreviousPage && (
          <Button asChild className="min-h-11" variant="outline">
            <Link
              aria-label={`Go to catalogue page ${page - 1}`}
              href={getCataloguePageURL({
                includeResultsAnchor: true,
                mode,
                page: page - 1,
                searchParams,
              })}
            >
              <ChevronLeft aria-hidden="true" />
              Previous
            </Link>
          </Button>
        )}
      </div>

      <p aria-current="page" className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>

      <div>
        {hasNextPage && (
          <Button asChild className="min-h-11" variant="outline">
            <Link
              aria-label={`Go to catalogue page ${page + 1}`}
              href={getCataloguePageURL({
                includeResultsAnchor: true,
                mode,
                page: page + 1,
                searchParams,
              })}
            >
              Next
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  )
}
