import { algoliasearch } from 'algoliasearch'
import type { Blog } from './db/schema'

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!,
  process.env.ALGOLIA_ADMIN_API_KEY!
)

export async function syncBlog(blog: Blog) {
  await client.saveObject({
    indexName: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_INDEX_NAME!,
    body: {
      objectID: blog.id,
      title: blog.title,
      summary: blog.summary,
      content: blog.content,
      tags: blog.tags,
      createdAt: blog.createdAt.getTime(),
      autoGenerateObjectIDIfNotExist: true
    }
  })
}
