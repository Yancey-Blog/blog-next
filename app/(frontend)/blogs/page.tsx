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

  // 只显示已发布的博客
  const { data: blogs, pagination } = await BlogService.getBlogs({
    page,
    pageSize: 10,
    published: true,
    search
  })

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-4xl font-bold">博客</h1>

      {/* 搜索框 */}
      <form className="mb-8">
        <input
          type="text"
          name="search"
          placeholder="搜索博客..."
          defaultValue={search}
          className="w-full max-w-md rounded-md border px-4 py-2"
        />
      </form>

      {/* 博客列表 */}
      {blogs.length === 0 ? (
        <p className="text-muted-foreground">暂无博客</p>
      ) : (
        <div className="grid gap-6">
          {blogs.map((blog) => (
            <article
              key={blog.id}
              className="rounded-lg border p-6 transition hover:shadow-lg"
            >
              <Link href={`/blogs/${blog.slug}`}>
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

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/blogs?page=${page - 1}${search ? `&search=${search}` : ''}`}
              className="rounded-md border px-4 py-2"
            >
              上一页
            </Link>
          )}
          <span className="px-4 py-2">
            第 {page} / {pagination.totalPages} 页
          </span>
          {page < pagination.totalPages && (
            <Link
              href={`/blogs?page=${page + 1}${search ? `&search=${search}` : ''}`}
              className="rounded-md border px-4 py-2"
            >
              下一页
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
