'use client'

import { usePathname, useSearchParams } from 'next/navigation'

import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'

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

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const delta = 2 // Number of pages to show on each side of current page

    pages.push(1)

    const rangeStart = Math.max(2, currentPage - delta)
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta)

    if (rangeStart > 2) {
      pages.push('ellipsis')
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i)
    }

    if (rangeEnd < totalPages - 1) {
      pages.push('ellipsis')
    }

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

  if (totalPages <= 1) {
    return null
  }

  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages
  const pageNumbers = getPageNumbers()

  return (
    <PaginationRoot>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={isFirstPage}
            className={isFirstPage ? 'pointer-events-none opacity-50' : ''}
            href={
              useUrlQuery ? createPageUrl(Math.max(1, currentPage - 1)) : '#'
            }
            onClick={
              useUrlQuery
                ? undefined
                : (e) => {
                    e.preventDefault()
                    onPageChange?.(currentPage - 1)
                  }
            }
          />
        </PaginationItem>

        {pageNumbers.map((page, index) =>
          page === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={page === currentPage}
                href={useUrlQuery ? createPageUrl(page) : '#'}
                onClick={
                  useUrlQuery
                    ? undefined
                    : (e) => {
                        e.preventDefault()
                        onPageChange?.(page)
                      }
                }
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            aria-disabled={isLastPage}
            className={isLastPage ? 'pointer-events-none opacity-50' : ''}
            href={
              useUrlQuery
                ? createPageUrl(Math.min(totalPages, currentPage + 1))
                : '#'
            }
            onClick={
              useUrlQuery
                ? undefined
                : (e) => {
                    e.preventDefault()
                    onPageChange?.(currentPage + 1)
                  }
            }
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  )
}
