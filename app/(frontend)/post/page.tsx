import { Pagination } from '@/components/ui/pagination'
import { BlogService } from '@/lib/services/blog.service'
import Link from 'next/link'

export default async function BlogsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''

  // Only show published blogs
  const { data: blogs, pagination } = await BlogService.getBlogs({
    page,
    pageSize: 10,
    published: true,
    search
  })

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-4xl font-bold">Blogs</h1>

      {/* Search */}
      <form className="mb-8">
        <div className="relative max-w-md">
          <input
            type="text"
            name="search"
            placeholder="搜索博客标题或内容..."
            defaultValue={search}
            className="w-full rounded-md border bg-background px-4 py-2 pr-20 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground transition hover:bg-primary/90"
          >
            搜索
          </button>
        </div>
      </form>

      {/* Blogs列表 */}
      {blogs.length === 0 ? (
        <p className="text-muted-foreground">暂无Blogs</p>
      ) : (
        <div className="grid gap-6">
          {blogs.map((blog) => (
            <article
              key={blog.id}
              className="rounded-lg border p-6 transition hover:shadow-lg"
            >
              <Link href={`/post/${blog.id}`}>
                <h2 className="mb-2 text-2xl font-semibold">{blog.title}</h2>
              </Link>
              {blog.summary && (
                <p className="text-muted-foreground mb-4">{blog.summary}</p>
              )}
              <time className="text-muted-foreground text-sm">
                {new Date(blog.createdAt).toLocaleDateString('zh-CN')}
              </time>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-8">
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          useUrlQuery
        />
      </div>
    </div>
  )
}
