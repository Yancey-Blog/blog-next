import { LazyLoadImage } from '@/components/lazy-load-image'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { BlogService } from '@/lib/services/blog.service'
import { eq } from 'drizzle-orm'
import { ArrowRight, Eye, Heart } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Home | Blog - Thoughts, Stories & Ideas',
  description:
    'Welcome to our blog. Discover articles about technology, design, and everything in between. Fresh perspectives and insights from our community.'
}

export default async function Home() {
  // Fetch latest 6 published blogs for homepage
  const { data: latestBlogs } = await BlogService.getBlogs({
    page: 1,
    pageSize: 9,
    published: true
  })

  // Fetch author information
  const authorIds = [...new Set(latestBlogs.map((blog) => blog.authorId))]
  const authors =
    authorIds.length > 0
      ? await db
          .select()
          .from(users)
          .where(eq(users.id, authorIds[0]))
          .limit(authorIds.length)
      : []

  const authorMap = new Map(authors.map((author) => [author.id, author]))

  // Fetch remaining authors if needed
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
    <div className="min-h-screen">
      {/* Hero Section - Full viewport with background image */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 -z-10">
          <div
            className="h-full w-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage:
                'url(https://edge.yancey.app/beg/ng9bwfv1-1728444113930.jpeg)'
            }}
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Hero content */}
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Main heading with glitch effect */}
            <h1
              className="glitch-text text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl"
              data-text="HI, YANCEY!"
            >
              HI, YANCEY!
            </h1>

            {/* Motto - Japanese quote */}
            <div className="space-y-3">
              <p className="text-xl font-medium text-white/90 md:text-2xl">
                死は生の対極としてではなく、その一部として存在している。
              </p>
              <p className="text-sm text-white/70 md:text-base">
                Death is not the opposite of life, but a part of it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Articles Grid */}
      {latestBlogs.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            {/* Section header */}
            <div className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Latest Articles
                </h2>
                <p className="text-lg text-muted-foreground">
                  Fresh perspectives and insights
                </p>
              </div>
              <Link
                href="/post"
                className="hidden text-lg font-medium text-primary transition-colors hover:underline sm:block"
              >
                View all <ArrowRight className="ml-1 inline h-5 w-5" />
              </Link>
            </div>

            {/* Articles Grid - 3 columns */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {latestBlogs.map((blog) => {
                const author = authorMap.get(blog.authorId)
                return (
                  <article
                    key={blog.id}
                    className="group overflow-hidden rounded-2xl border bg-card transition-all"
                  >
                    <Link href={`/post/${blog.id}`}>
                      {/* Cover Image */}
                      {blog.coverImage && (
                        <div className="relative aspect-video w-full overflow-hidden bg-muted">
                          <LazyLoadImage
                            src={blog.coverImage}
                            alt={blog.title}
                            className="transition-transform duration-500 group-hover:scale-110"
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
                        <h3 className="mb-3 line-clamp-2 text-xl font-bold tracking-tight transition-colors group-hover:text-primary">
                          {blog.title}
                        </h3>

                        {/* Summary */}
                        {blog.summary && (
                          <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
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

            {/* Mobile view all link */}
            <div className="mt-12 text-center sm:hidden">
              <Link
                href="/post"
                className="inline-flex items-center gap-2 text-lg font-medium text-primary hover:underline"
              >
                View all articles
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
