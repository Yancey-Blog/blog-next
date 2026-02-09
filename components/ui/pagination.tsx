'use client'

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from './button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange?: (page: number) => void
  useUrlQuery?: boolean // If true, use URL query params instead of callback
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  useUrlQuery = false
}: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const delta = 2 // Number of pages to show on each side of current page

    // Always show first page
    pages.push(1)

    // Calculate range around current page
    const rangeStart = Math.max(2, currentPage - delta)
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta)

    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      pages.push('ellipsis')
    }

    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i)
    }

    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
      pages.push('ellipsis')
    }

    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    return `${pathname}?${params.toString()}`
  }

  const handlePageClick = (page: number) => {
    if (onPageChange) {
      onPageChange(page)
    }
  }

  const pageNumbers = getPageNumbers()

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      {/* Previous Button */}
      {useUrlQuery ? (
        <Link
          href={createPageUrl(Math.max(1, currentPage - 1))}
          className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
        >
          <Button variant="outline" size="sm" disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Page Numbers */}
      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <div
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center"
            >
              <MoreHorizontal className="h-4 w-4" />
            </div>
          )
        }

        const isActive = page === currentPage

        if (useUrlQuery) {
          return (
            <Link key={page} href={createPageUrl(page)}>
              <Button
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="h-9 w-9"
              >
                {page}
              </Button>
            </Link>
          )
        }

        return (
          <Button
            key={page}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className="h-9 w-9"
            onClick={() => handlePageClick(page)}
          >
            {page}
          </Button>
        )
      })}

      {/* Next Button */}
      {useUrlQuery ? (
        <Link
          href={createPageUrl(Math.min(totalPages, currentPage + 1))}
          className={
            currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''
          }
        >
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
