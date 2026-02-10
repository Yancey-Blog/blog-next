'use client'

import { BlogListTable } from '@/components/blog-list-table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useTRPC } from '@/lib/trpc/client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type StatusFilter = 'all' | 'published' | 'draft'

export default function BlogManagementPage() {
  const trpc = useTRPC()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Read values directly from URL (single source of truth)
  const page = Number(searchParams.get('page')) || 1
  const pageSize = 10
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || ''
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get('status') as StatusFilter) || 'all'
  )

  // Debounce search query to avoid too many requests
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Handle page change (for resetting to page 1 when filters change)
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newPage > 1) {
      params.set('page', newPage.toString())
    } else {
      params.delete('page')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Update URL when search or filter changes (reset to page 1)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    // Reset to page 1 when search or filter changes
    params.delete('page')

    if (debouncedSearchQuery) {
      params.set('search', debouncedSearchQuery)
    } else {
      params.delete('search')
    }

    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    } else {
      params.delete('status')
    }

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname

    router.replace(newUrl, { scroll: false })
    // Only run when search or filter changes, NOT when searchParams changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, statusFilter])

  const { data, isLoading } = useQuery(
    trpc.blog.list.queryOptions({
      page,
      pageSize,
      search: debouncedSearchQuery || undefined,
      published:
        statusFilter === 'all'
          ? undefined
          : statusFilter === 'published'
            ? true
            : false
    })
  )

  const blogs = data?.data || []
  const pagination = data?.pagination

  if (isLoading) {
    return (
      <div className="container mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="space-y-4">
          {/* Search and filter skeleton */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-10 w-64" />
          </div>

          {/* Table skeleton */}
          <div className="rounded-md border">
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blog Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all your blog posts
          </p>
        </div>
        <Link href="/admin/blog-management/create">
          <Button>Create Blog</Button>
        </Link>
      </div>

      <BlogListTable
        blogs={blogs}
        pagination={pagination}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />
    </div>
  )
}
