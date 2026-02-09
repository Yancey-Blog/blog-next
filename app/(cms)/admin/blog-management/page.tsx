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

  // Get initial values from URL
  const initialPage = Number(searchParams.get('page')) || 1
  const initialSearch = searchParams.get('search') || ''
  const initialStatus =
    (searchParams.get('status') as StatusFilter) || 'all'

  // Pagination and filter state
  const [page, setPage] = useState(initialPage)
  const [pageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)

  // Debounce search query to avoid too many requests
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()

    if (page > 1) params.set('page', page.toString())
    if (debouncedSearchQuery) params.set('search', debouncedSearchQuery)
    if (statusFilter !== 'all') params.set('status', statusFilter)

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname

    router.replace(newUrl, { scroll: false })
  }, [page, debouncedSearchQuery, statusFilter, pathname, router])

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
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  )
}
