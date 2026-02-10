import { LazyLoadImage } from '@/components/lazy-load-image'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { BlogService } from '@/lib/services/blog.service'
import { eq } from 'drizzle-orm'
import { Calendar, Eye, Heart, Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

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

  // Only show published blogs
  const { data: blogs, pagination } = await BlogService.getBlogs({
    page,
    pageSize: 12,
    published: true,
    search
  })

  // Fetch author information for all blogs
  const authorIds = [...new Set(blogs.map((blog) => blog.authorId))]
  const authors = await db
    .select()
    .from(users)
    .where(
      authorIds.length > 0
        ? eq(users.id, authorIds[0])
        : eq(users.id, 'non-existent')
    )
  const authorMap = new Map(authors.map((author) => [author.id, author]))

  // Fetch remaining authors if there are more
  if (authorIds.length > 1) {
    for (let i = 1; i < authorIds.length; i++) {
      const [author] = await db
        .select()
        .from(users)
        .where(eq(users.id, authorIds[i]))
        .limit(1)
      if (author) {
        authorMap.set(author.id, author)
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Discover Stories
        </h1>
        <p className="text-xl text-muted-foreground">
          Explore insights, tutorials, and thoughts
        </p>
      </div>

      {/* Search */}
      <form className="mb-12">
        <div className="relative mx-auto max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder="Search articles by title or content..."
            defaultValue={search}
            className="w-full rounded-full border-2 bg-background py-3 pl-12 pr-32 text-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Search
          </button>
        </div>
      </form>

      {/* Blogs Grid */}
      {blogs.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-xl text-muted-foreground">
            No articles found. Try a different search term.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => {
            const author = authorMap.get(blog.authorId)
            return (
              <article
                key={blog.id}
                className="group overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-xl"
              >
                <Link href={`/post/${blog.id}`}>
                  {/* Cover Image */}
                  {blog.coverImage && (
                    <div className="relative aspect-video w-full overflow-hidden bg-muted">
                      <LazyLoadImage
                        src={blog.coverImage}
                        alt={blog.title}
                        className="transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    {/* Tags */}
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

                    {/* Title */}
                    <h2 className="mb-3 line-clamp-2 text-2xl font-bold tracking-tight group-hover:text-primary">
                      {blog.title}
                    </h2>

                    {/* Summary */}
                    {blog.summary && (
                      <p className="mb-4 line-clamp-3 text-muted-foreground">
                        {blog.summary}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 border-t pt-4 text-sm text-muted-foreground">
                      {/* Author */}
                      {author && (
                        <div className="flex items-center gap-2">
                          {author.image && (
                            <div className="h-6 w-6 overflow-hidden rounded-full">
                              <LazyLoadImage
                                src={author.image}
                                alt={author.name}
                                className="h-6 w-6"
                              />
                            </div>
                          )}
                          <span className="font-medium">{author.name}</span>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <time>
                          {new Date(blog.createdAt).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric'
                            }
                          )}
                        </time>
                      </div>

                      {/* Stats */}
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
            )
          })}
        </div>
      )}

      {/* Pagination */}
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
  )
}
