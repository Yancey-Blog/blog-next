import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Calendar, Eye, Heart, Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { LazyLoadImage } from '@/components/lazy-load-image'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { getQueryClient, trpc } from '@/lib/trpc/server'

export const metadata: Metadata = {
  title: 'All Articles | Blog',
  description:
    'Explore our collection of articles about technology, design, and more. Discover insights, tutorials, and thoughts from our community.'
}

export default async function BlogsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const queryClient = getQueryClient()

  const blogsData = await queryClient.fetchQuery(
    trpc.blog.list.queryOptions({
      page,
      pageSize: 12,
      search
    })
  )
  const blogs = blogsData.data
  const pagination = blogsData.pagination

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold tracking-tight">
            Discover Stories
          </h1>
          <p className="text-muted-foreground text-xl">
            Explore insights, tutorials, and thoughts
          </p>
        </div>

        <form className="mb-12">
          <div className="relative mx-auto max-w-2xl">
            <Search className="text-muted-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              placeholder="Search articles by title or content..."
              defaultValue={search}
              className="bg-background focus:border-primary focus:ring-primary/20 w-full rounded-full border-2 py-3 pr-32 pl-12 text-lg focus:ring-2 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 absolute top-1/2 right-2 -translate-y-1/2 rounded-full px-6 py-2 text-sm font-medium transition"
            >
              Search
            </button>
          </div>
        </form>

        {blogs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-xl">
              No articles found. Try a different search term.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <article
                key={blog.id}
                className="group bg-card flex flex-col overflow-hidden rounded-2xl border transition-all hover:shadow-xl"
              >
                <Link
                  href={`/post/${blog.id}`}
                  className="flex flex-1 flex-col"
                >
                  {blog.coverImage && (
                    <div className="bg-muted relative aspect-video w-full overflow-hidden">
                      <LazyLoadImage
                        src={blog.coverImage}
                        alt={blog.title}
                        className="transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-6">
                    {blog.tags && blog.tags.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {blog.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {blog.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{blog.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    <h2 className="group-hover:text-primary mb-3 line-clamp-2 text-2xl font-bold tracking-tight">
                      {blog.title}
                    </h2>

                    <p className="text-muted-foreground mb-4 line-clamp-3 flex-1">
                      {blog.summary ?? ''}
                    </p>

                    <div className="text-muted-foreground flex items-center gap-4 border-t pt-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <time>
                          {format(new Date(blog.createdAt), 'MMM d, yyyy')}
                        </time>
                      </div>

                      <div className="ml-auto flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{blog.pv}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" />
                          <span>{blog.like}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-12 flex justify-center">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              useUrlQuery
            />
          </div>
        )}
      </div>
    </HydrationBoundary>
  )
}
