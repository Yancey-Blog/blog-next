import { BlogService } from '@/lib/services/blog.service'
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

  return (
    <div className="container mx-auto py-8">
      <article className="prose prose-lg mx-auto">
        {blog.coverImage && (
          <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={blog.coverImage}
              alt={blog.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        <h1 className="mb-4">{blog.title}</h1>
        <time className="text-muted-foreground mb-8 block text-sm">
          {new Date(blog.createdAt).toLocaleDateString('en-US', {
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
