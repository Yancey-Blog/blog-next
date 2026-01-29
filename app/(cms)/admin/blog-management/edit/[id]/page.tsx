import { BlogForm } from '@/components/blog-form'
import { BlogVersionHistory } from '@/components/blog-version-history'
import { db } from '@/lib/db'
import { blogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

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

  return (
    <div className="container mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Blog</h1>
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
