import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

import { BlogForm } from '@/components/blog-form'
import { BlogVersionHistory } from '@/components/blog-version-history'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { blogs } from '@/lib/db/schema'

export default async function EditBlogPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [blog] = await db.select().from(blogs).where(eq(blogs.id, id)).limit(1)

  if (!blog) {
    notFound()
  }

  const isPublished = blog?.published || false
  return (
    <div className="container mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex gap-2 text-3xl font-bold">
            Edit Blog
            {isPublished ? (
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
