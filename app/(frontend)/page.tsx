import { LazyLoadImage } from '@/components/lazy-load-image'
import { ParallaxHero } from '@/components/parallax-hero'
import { Badge } from '@/components/ui/badge'
import { getQueryClient, trpc } from '@/lib/trpc/server'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { ArrowRight, Calendar, Eye, Heart } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Home | Yancey Blog - Thoughts, Stories & Ideas',
  description:
    'Welcome to Yancey blog. Discover articles about technology, design, and everything in between. Fresh perspectives and insights from our community.'
}

export default async function Home() {
  const queryClient = getQueryClient()

  // Fetch data via tRPC - fetchQuery ensures data is available
  const blogsData = await queryClient.fetchQuery(
    trpc.blog.list.queryOptions({
      page: 1,
      pageSize: 9
    })
  )
  const latestBlogs = blogsData.data

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-screen">
        {/* Hero Section */}
        <ParallaxHero imageUrl="https://static.yancey.app/ng9bwfv1-1728444113930.jpeg">
          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="mx-auto max-w-4xl space-y-8">
              <h1
                className="glitch-text text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl"
                data-text="HI, YANCEY!"
              >
                HI, YANCEY!
              </h1>

              <p className="text-xl font-medium text-white/90 md:text-2xl">
                死は生の対極としてではなく、その一部として存在している。
              </p>
            </div>
          </div>
        </ParallaxHero>

        {/* Latest Articles Grid */}
        {latestBlogs.length > 0 && (
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
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

              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {latestBlogs.map((blog) => (
                    <article
                      key={blog.id}
                      className="group overflow-hidden rounded-2xl border bg-card transition-all"
                    >
                      <Link href={`/post/${blog.id}`}>
                        {blog.coverImage && (
                          <div className="relative aspect-video w-full overflow-hidden bg-muted">
                            <LazyLoadImage
                              src={blog.coverImage}
                              alt={blog.title}
                              className="transition-transform duration-500 group-hover:scale-110"
                            />
                          </div>
                        )}

                        <div className="p-6">
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

                          <h3 className="mb-3 line-clamp-2 text-xl font-bold tracking-tight transition-colors group-hover:text-primary">
                            {blog.title}
                          </h3>

                          {blog.summary && (
                            <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                              {blog.summary}
                            </p>
                          )}

                          <div className="flex items-center gap-4 border-t pt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <time>
                                {new Date(blog.createdAt).toLocaleDateString(
                                  'en-US',
                                  { month: 'short', day: 'numeric' }
                                )}
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
    </HydrationBoundary>
  )
}
