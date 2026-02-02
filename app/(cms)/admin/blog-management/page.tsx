'use client'

import { BlogListTable } from '@/components/blog-list-table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTRPC } from '@/lib/trpc/client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

export default function BlogManagementPage() {
  const trpc = useTRPC()

  const { data, isLoading } = useQuery(
    trpc.blog.list.queryOptions({
      page: 1,
      pageSize: 100 // Increased to show more results for client-side filtering
    })
  )

  const blogs = data?.data || []

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

      {blogs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">No blog posts yet</p>
          <Link href="/admin/blog-management/create">
            <Button>Create Your First Blog</Button>
          </Link>
        </div>
      ) : (
        <BlogListTable blogs={blogs} />
      )}
    </div>
  )
}
