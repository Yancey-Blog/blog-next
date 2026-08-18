import { LazyLoadImage } from '@/components/lazy-load-image'
import type { AdjacentBlog } from '@/lib/services/blog.service'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface BlogAdjacentNavProps {
  prev: AdjacentBlog | null
  next: AdjacentBlog | null
}

export function BlogAdjacentNav({ prev, next }: BlogAdjacentNavProps) {
  // Boundary case: a single published post has neither a prev nor a next.
  if (!prev && !next) return null

  // Boundary case: the oldest/newest post only has one side. Let that lone
  // card span the full row instead of leaving the other half blank.
  const isSingle = !prev || !next

  return (
    <nav
      aria-label="More posts"
      className="my-10 grid grid-cols-1 gap-4 border-y border-border py-6 sm:grid-cols-2"
    >
      {prev && (
        <AdjacentCard
          blog={prev}
          direction="prev"
          className={isSingle ? 'sm:col-span-2' : 'sm:col-start-1'}
        />
      )}
      {next && (
        <AdjacentCard
          blog={next}
          direction="next"
          className={isSingle ? 'sm:col-span-2' : 'sm:col-start-2'}
        />
      )}
    </nav>
  )
}

function AdjacentCard({
  blog,
  direction,
  className
}: {
  blog: AdjacentBlog
  direction: 'prev' | 'next'
  className?: string
}) {
  const isNext = direction === 'next'

  return (
    <Link
      href={`/post/${blog.id}`}
      className={cn(
        'group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent',
        isNext && 'sm:flex-row-reverse sm:text-right',
        className
      )}
    >
      {blog.coverImage && (
        <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-28">
          <LazyLoadImage src={blog.coverImage} alt={blog.title} fill />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground',
            isNext && 'sm:flex-row-reverse'
          )}
        >
          {isNext ? (
            <>
              Next Post
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous Post
            </>
          )}
        </div>
        <p className="line-clamp-2 font-semibold group-hover:text-primary">
          {blog.title}
        </p>
      </div>
    </Link>
  )
}
