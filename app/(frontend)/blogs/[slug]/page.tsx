import { BlogService } from '@/lib/services/blog.service'
import { notFound } from 'next/navigation'

export default async function BlogDetailPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const blog = await BlogService.getBlogBySlug(slug)

  if (!blog || !blog.published) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8">
      <article className="prose prose-lg mx-auto">
        {blog.coverImage && (
          <img
            src={blog.coverImage}
            alt={blog.title}
            className="mb-8 w-full rounded-lg"
          />
        )}
        <h1 className="mb-4">{blog.title}</h1>
        <time className="text-muted-foreground mb-8 block text-sm">
          {new Date(blog.createdAt).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </time>
        <div
          className="whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
      </article>
    </div>
  )
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const blog = await BlogService.getBlogBySlug(slug)

  if (!blog) {
    return {
      title: '博客不存在'
    }
  }

  return {
    title: blog.title,
    description: blog.summary
  }
}
