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
      // Field names below match what components/algolia-search.tsx reads
      // off Algolia hits (name/description/labels), not the DB column names.
      name: blog.title,
      description: blog.summary,
      content: blog.content,
      coverImage: blog.coverImage,
      labels: blog.tags,
      createdAt: blog.createdAt.getTime()
    }
  })
}

export async function removeBlogFromIndex(id: string) {
  await client.deleteObject({ indexName, objectID: id })
}
