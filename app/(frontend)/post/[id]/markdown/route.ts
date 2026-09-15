import { BlogService } from '@/lib/services/blog.service'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL

/**
 * AI-facing Markdown alternate of a post, reached via /post/{id}.md
 * (rewritten here from `proxy.ts`). Serves the same `markdownContent`
 * that's derived from `contentBlocks` at save time — see
 * BlogService.createBlog/updateBlog.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const blog = await BlogService.getBlogById(id)

  if (!blog || !blog.published) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }

  const body = blog.markdownContent ?? blog.summary
  const publishedDate = new Date(blog.createdAt).toISOString().slice(0, 10)
  const markdown = [
    `# ${blog.title}`,
    '',
    `> ${blog.summary}`,
    '',
    body,
    '',
    '---',
    '',
    `Source: ${APP_URL}/post/${blog.id}`,
    `Published: ${publishedDate}`,
    blog.tags.length > 0 ? `Tags: ${blog.tags.join(', ')}` : null
  ]
    .filter((line) => line !== null)
    .join('\n')

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
