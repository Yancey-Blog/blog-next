import { BlogService } from '@/lib/services/blog.service'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL

/**
 * llms.txt (https://llmstxt.org) — a machine-readable index for AI agents.
 * Every entry links straight to a post's Markdown alternate
 * (/post/{id}.md, served via proxy.ts + post/[id]/markdown/route.ts).
 */
export async function GET() {
  const { data: posts } = await BlogService.getBlogs({
    published: true,
    page: 1,
    pageSize: 1000
  })

  const lines = [
    '# Yancey Blog',
    '',
    "> Yancey's personal blog - thoughts, stories and ideas about technology, design, and life.",
    '',
    `Every post is also available as clean Markdown by appending \`.md\` to its URL, e.g. \`${APP_URL}/post/{id}.md\`.`,
    '',
    '## Posts',
    '',
    ...posts.map(
      (post) =>
        `- [${post.title}](${APP_URL}/post/${post.id}.md): ${post.summary}`
    )
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
