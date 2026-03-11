'use client'

import { LazyLoadImage } from '@/components/lazy-load-image'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Calendar, Eye, Heart } from 'lucide-react'
import Link from 'next/link'

interface Blog {
  id: string
  title: string
  summary?: string | null
  coverImage?: string | null
  tags?: string[] | null
  createdAt: Date
  pv: number
  like: number
}

function formatDate(date: Date) {
  return format(new Date(date), 'MMM d, yyyy')
}

// ── Featured Post ────────────────────────────────────────────────────────────

function FeaturedPost({ blog }: { blog: Blog }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="mb-16"
    >
      <Link href={`/post/${blog.id}`} className="group block">
        <div className="relative h-[55vh] min-h-[360px] overflow-hidden rounded-3xl">
          {/* Cover image */}
          {blog.coverImage ? (
            <LazyLoadImage
              src={blog.coverImage}
              alt={blog.title}
              fill
              priority
              className="transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Content */}
          <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
            {/* Tags */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold tracking-wider text-primary-foreground">
                LATEST
              </span>
              {blog.tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/25 px-3 py-1 text-xs text-white/75"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h2 className="mb-3 line-clamp-2 text-2xl font-bold text-white md:text-4xl">
              {blog.title}
            </h2>

            {/* Summary */}
            {blog.summary && (
              <p className="mb-5 line-clamp-2 max-w-2xl text-sm text-white/65 md:text-base">
                {blog.summary}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-5 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(blog.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {blog.pv}
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                {blog.like}
              </span>
              <span className="ml-auto flex items-center gap-1.5 font-semibold text-white transition-all group-hover:gap-2.5">
                Read more{' '}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({ blog, index }: { blog: Blog; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.55,
        delay: (index % 3) * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94] as const
      }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-xl"
    >
      <Link href={`/post/${blog.id}`} className="flex flex-1 flex-col">
        {blog.coverImage && (
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <LazyLoadImage
              src={blog.coverImage}
              alt={blog.title}
              className="transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        )}

        <div className="flex flex-1 flex-col p-6">
          {blog.tags && blog.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {blog.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
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

          <p className="mb-4 line-clamp-3 flex-1 text-sm text-muted-foreground">
            {blog.summary ?? ''}
          </p>

          <div className="flex items-center gap-4 border-t pt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <time>{formatDate(blog.createdAt)}</time>
            </span>
            <div className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {blog.pv}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {blog.like}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mb-10 flex items-end justify-between"
    >
      <div>
        <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-primary">
          RECENT POSTS
        </p>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Latest Articles
        </h2>
      </div>
      <Link
        href="/post"
        className="hidden items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
      >
        View all <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function HomeArticles({ blogs }: { blogs: Blog[] }) {
  if (blogs.length === 0) return null

  const [featured, ...rest] = blogs

  return (
    <section className="mb-20 md:mb-28">
      <div className="container mx-auto px-4">
        <FeaturedPost blog={featured} />
        <SectionHeader />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((blog, i) => (
            <ArticleCard key={blog.id} blog={blog} index={i} />
          ))}
        </div>

        <div className="mt-12 text-center sm:hidden">
          <Link
            href="/post"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            View all articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
