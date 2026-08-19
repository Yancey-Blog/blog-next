import { algoliasearch } from 'algoliasearch'

import type { Blog } from './db/schema'

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!
)

const indexName = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_INDEX_NAME!

export async function syncBlog(blog: Blog) {
  await client.saveObject({
    indexName,
    body: {
      objectID: blog.id,
      title: blog.title,
      summary: blog.summary,
      content: blog.content,
      tags: blog.tags,
      createdAt: blog.createdAt.getTime()
    }
  })
}

export async function removeBlogFromIndex(id: string) {
  await client.deleteObject({ indexName, objectID: id })
}
