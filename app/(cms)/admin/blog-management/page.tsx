import { BlogListTable } from '@/components/blog-list-table'
import { Button } from '@/components/ui/button'
import { BlogService } from '@/lib/services/blog.service'
import { getSession } from '@/lib/session'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function BlogManagementPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const params = await searchParams
  const page = Number(params.page) || 1

  const { data: blogs, pagination } = await BlogService.getBlogs({
    page,
    pageSize: 100, // Increased to show more results for client-side filtering
    authorId: session.user.id
  })

  return (
    <div className="container mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blog Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all your blog posts
          </p>
        </div>
        <Link href="/admin/blog-management/create">
          <Button>Create Blog</Button>
        </Link>
      </div>

      {blogs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">No blog posts yet</p>
          <Link href="/admin/blog-management/create">
            <Button>Create Your First Blog</Button>
          </Link>
        </div>
      ) : (
        <>
          <BlogListTable blogs={blogs} />

          {pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {page > 1 && (
                <Link href={`/admin/blog-management?page=${page - 1}`}>
                  <Button variant="outline">Previous</Button>
                </Link>
              )}
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              {page < pagination.totalPages && (
                <Link href={`/admin/blog-management?page=${page + 1}`}>
                  <Button variant="outline">Next</Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
