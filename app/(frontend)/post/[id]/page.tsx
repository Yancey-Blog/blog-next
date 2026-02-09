import { BlogToc } from '@/components/blog-toc'
import { Badge } from '@/components/ui/badge'
import { highlightHtml } from '@/lib/highlight-html'
import { BlogService } from '@/lib/services/blog.service'
import { Calendar, Clock, Eye, Heart } from 'lucide-react'
import Image from 'next/image'
import { notFound } from 'next/navigation'

export default async function BlogDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const blog = await BlogService.getBlogById(id)

  if (!blog || !blog.published) {
    notFound()
  }

  const content = await highlightHtml(blog.content)

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="relative">
          <article className="mx-auto max-w-4xl xl:mr-72">
            {blog.coverImage && (
              <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg shadow-lg">
                <Image
                  src={blog.coverImage}
                  alt={blog.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
              {blog.title}
            </h1>

            {/* Metadata */}
            <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-y border-border py-4">
              {/* Created Date */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <time>
                  {new Date(blog.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </time>
              </div>

              {/* Updated Date (if different from created) */}
              {new Date(blog.updatedAt).getTime() !==
                new Date(blog.createdAt).getTime() && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <time>
                    Updated{' '}
                    {new Date(blog.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </time>
                </div>
              )}

              {/* Views */}
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span>{blog.pv.toLocaleString()} views</span>
              </div>

              {/* Likes */}
              <div className="flex items-center gap-1.5">
                <Heart className="h-4 w-4" />
                <span>{blog.like.toLocaleString()} likes</span>
              </div>

              {/* Tags */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  {blog.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="mb-6 border-l-4 border-primary/50 bg-muted/30 p-4 rounded-r-lg">
              <p className="text-lg leading-relaxed text-muted-foreground italic">
                {blog.summary}
              </p>
            </div>

            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </article>

          <BlogToc content={content} />
        </div>
      </div>
    </>
  )
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const blog = await BlogService.getBlogById(id)

  if (!blog) {
    return {
      title: 'Blog not found'
    }
  }

  return {
    title: blog.title,
    description: blog.summary
  }
}
