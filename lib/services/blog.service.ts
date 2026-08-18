import { db } from '@/lib/db'
import { blogs, type Blog, type InsertBlog } from '@/lib/db/schema'
import { highlightHtml } from '@/lib/shiki'
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  lt,
  ne,
  or,
  sql,
  sum
} from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export interface AdjacentBlog {
  id: string
  title: string
  coverImage: string
}

export interface GetBlogsOptions {
  page?: number
  pageSize?: number
  published?: boolean
  search?: string
  authorId?: string
}

export class BlogService {
  /**
   * Get list of blogs
   */
  static async getBlogs(options: GetBlogsOptions = {}) {
    const { page = 1, pageSize = 10, published, search, authorId } = options

    const offset = (page - 1) * pageSize
    const conditions = []

    if (published !== undefined) {
      conditions.push(eq(blogs.published, published))
    }

    if (authorId) {
      conditions.push(eq(blogs.authorId, authorId))
    }

    if (search) {
      conditions.push(
        or(
          ilike(blogs.title, `%${search}%`),
          ilike(blogs.content, `%${search}%`)
        )
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, totalCount] = await Promise.all([
      db
        .select({
          id: blogs.id,
          title: blogs.title,
          summary: blogs.summary,
          coverImage: blogs.coverImage,
          published: blogs.published,
          tags: blogs.tags,
          like: blogs.like,
          pv: blogs.pv,
          authorId: blogs.authorId,
          createdAt: blogs.createdAt,
          updatedAt: blogs.updatedAt
        })
        .from(blogs)
        .where(whereClause)
        .orderBy(desc(blogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: blogs.id })
        .from(blogs)
        .where(whereClause)
        .then((result) => result.length)
    ])

    return {
      data: items,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    }
  }

  /**
   * Get the published posts immediately before and after the given post,
   * ordered chronologically by createdAt (prev = older, next = newer).
   * The id tie-breaks posts sharing the same createdAt.
   *
   * The anchor's createdAt is read via a correlated subquery rather than
   * passed in as a JS Date: Postgres timestamps carry microsecond
   * precision, but a JS Date only holds milliseconds, so a value round-
   * tripped through JS would compare unequal to (and even less than) the
   * row it came from, making a post spuriously match as its own neighbor.
   */
  static async getAdjacentBlogs(
    id: string
  ): Promise<{ prev: AdjacentBlog | null; next: AdjacentBlog | null }> {
    const selection = {
      id: blogs.id,
      title: blogs.title,
      coverImage: blogs.coverImage
    }
    const anchorCreatedAt = sql`(select ${blogs.createdAt} from ${blogs} where ${blogs.id} = ${id})`

    const [prevRows, nextRows] = await Promise.all([
      db
        .select(selection)
        .from(blogs)
        .where(
          and(
            eq(blogs.published, true),
            ne(blogs.id, id),
            or(
              lt(blogs.createdAt, anchorCreatedAt),
              and(eq(blogs.createdAt, anchorCreatedAt), lt(blogs.id, id))
            )
          )
        )
        .orderBy(desc(blogs.createdAt), desc(blogs.id))
        .limit(1),
      db
        .select(selection)
        .from(blogs)
        .where(
          and(
            eq(blogs.published, true),
            ne(blogs.id, id),
            or(
              gt(blogs.createdAt, anchorCreatedAt),
              and(eq(blogs.createdAt, anchorCreatedAt), gt(blogs.id, id))
            )
          )
        )
        .orderBy(asc(blogs.createdAt), asc(blogs.id))
        .limit(1)
    ])

    return {
      prev: prevRows[0] ?? null,
      next: nextRows[0] ?? null
    }
  }

  /**
   * Get blog by ID
   */
  static async getBlogById(id: string): Promise<Blog | null> {
    const [blog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, id))
      .limit(1)

    return blog || null
  }

  /**
   * Create a new blog
   */
  static async createBlog(
    data: Omit<InsertBlog, 'id' | 'content' | 'highlightedContent'> & {
      id?: string
      contentBlocks: string
    }
  ): Promise<Blog> {
    // Lazy import: `@/lib/blocknote/server` pulls in `@blocknote/server-util`
    // -> `@blocknote/react` (a client-only module). Importing it statically
    // would break React Server Components that only READ blogs. Only the
    // write paths need it, so load it on demand here.
    const { blocksToContentHtml } = await import('@/lib/blocknote/server')
    const blocks = JSON.parse(data.contentBlocks)
    const content = await blocksToContentHtml(blocks)
    const highlighted = await highlightHtml(content)
    const blogData = {
      ...data,
      id: data.id || uuidv4(),
      content,
      contentBlocks: data.contentBlocks,
      highlightedContent: highlighted
    }
    const [newBlog] = await db
      .insert(blogs)
      .values(blogData as InsertBlog)
      .returning()

    return newBlog
  }

  /**
   * Update a blog
   */
  static async updateBlog(
    id: string,
    data: Partial<InsertBlog> & { contentBlocks?: string }
  ): Promise<Blog | null> {
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date()
    }

    if (data.contentBlocks) {
      const { blocksToContentHtml } = await import('@/lib/blocknote/server')
      const blocks = JSON.parse(data.contentBlocks)
      const content = await blocksToContentHtml(blocks)
      updateData.content = content
      updateData.contentBlocks = data.contentBlocks
      updateData.highlightedContent = await highlightHtml(content)
    }

    const [updatedBlog] = await db
      .update(blogs)
      .set(updateData)
      .where(eq(blogs.id, id))
      .returning()

    return updatedBlog || null
  }

  /**
   * Increment view count
   */
  static async viewBlog(id: string): Promise<void> {
    await db
      .update(blogs)
      .set({ pv: sql`${blogs.pv} + 1` })
      .where(eq(blogs.id, id))
  }

  /**
   * Increment like count
   */
  static async likeBlog(id: string): Promise<Blog | null> {
    const [updated] = await db
      .update(blogs)
      .set({ like: sql`${blogs.like} + 1` })
      .where(eq(blogs.id, id))
      .returning()

    return updated || null
  }

  /**
   * Get dashboard stats
   */
  static async getStats() {
    const [totalRes, publishedRes, pvRes, likeRes] = await Promise.all([
      db.select({ count: count() }).from(blogs),
      db
        .select({ count: count() })
        .from(blogs)
        .where(eq(blogs.published, true)),
      db.select({ sum: sum(blogs.pv) }).from(blogs),
      db.select({ sum: sum(blogs.like) }).from(blogs)
    ])

    const total = totalRes[0].count
    const published = publishedRes[0].count
    return {
      total,
      published,
      drafts: total - published,
      totalPv: Number(pvRes[0].sum ?? 0),
      totalLike: Number(likeRes[0].sum ?? 0)
    }
  }

  /**
   * Get blog publish counts per month for the last 12 months
   */
  static async getBlogsByMonth(): Promise<{ month: string; count: number }[]> {
    const rows = await db
      .select({
        month: sql<string>`to_char(${blogs.createdAt}, 'YYYY-MM')`,
        count: count()
      })
      .from(blogs)
      .where(
        and(
          eq(blogs.published, true),
          sql`${blogs.createdAt} >= NOW() - INTERVAL '12 months'`
        )
      )
      .groupBy(sql`to_char(${blogs.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${blogs.createdAt}, 'YYYY-MM') ASC`)

    return rows.map((r) => ({ month: r.month, count: r.count }))
  }

  /**
   * Get chart data for dashboard
   */
  static async getChartData() {
    const [topByPv, topByLike, tagStats] = await Promise.all([
      db
        .select({ id: blogs.id, title: blogs.title, pv: blogs.pv })
        .from(blogs)
        .where(eq(blogs.published, true))
        .orderBy(desc(blogs.pv))
        .limit(7),
      db
        .select({ id: blogs.id, title: blogs.title, like: blogs.like })
        .from(blogs)
        .where(eq(blogs.published, true))
        .orderBy(desc(blogs.like))
        .limit(7),
      db
        .select({
          tag: sql<string>`unnest(${blogs.tags})`,
          count: count()
        })
        .from(blogs)
        .groupBy(sql`unnest(${blogs.tags})`)
        .orderBy(desc(count()))
        .limit(12)
    ])
    return { topByPv, topByLike, tagStats }
  }

  /**
   * Delete a blog
   */
  static async deleteBlog(id: string): Promise<boolean> {
    const result = await db.delete(blogs).where(eq(blogs.id, id)).returning()

    return result.length > 0
  }
}
