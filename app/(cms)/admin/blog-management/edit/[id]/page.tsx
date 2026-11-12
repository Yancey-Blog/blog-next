'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { BlogForm } from '@/components/blog-form'
import { BlogVersionHistory } from '@/components/blog-version-history'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTRPC } from '@/lib/trpc/client'

export default function EditBlogPage() {
  const { id } = useParams<{ id: string }>()
  const trpc = useTRPC()
  const blogQuery = useQuery(trpc.admin.blog.byId.queryOptions({ id }))

  if (blogQuery.isPending) {
    return (
      <div className="container mx-auto" role="status" aria-busy="true">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="min-h-96 w-full" />
        </div>
      </div>
    )
  }

  if (blogQuery.isError || !blogQuery.data) {
    return (
      <div className="mx-auto flex min-h-64 max-w-lg flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-lg font-semibold">
          {blogQuery.isError ? 'Could not load this post' : 'Post not found'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {blogQuery.isError
            ? 'Check your connection and try again.'
            : 'This post may have been deleted.'}
        </p>
        {blogQuery.isError && (
          <Button variant="outline" onClick={() => void blogQuery.refetch()}>
            Try again
          </Button>
        )}
        <Button variant="ghost" render={<Link href="/admin/blog-management" />}>
          Back to posts
        </Button>
      </div>
    )
  }

  const blog = blogQuery.data
  return (
    <div className="container mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex gap-2 text-3xl font-bold">
            Edit Blog
            {blog.published ? (
              <Badge className="h-5 bg-green-500 hover:bg-green-600">
                Published
              </Badge>
            ) : (
              <Badge variant="secondary" className="h-5">
                Draft
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            Modify blog content, each save creates a version snapshot
          </p>
        </div>
        <BlogVersionHistory blogId={blog.id} />
      </div>

      <BlogForm blog={blog} mode="edit" />
    </div>
  )
}
