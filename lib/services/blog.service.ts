import { db } from '@/lib/db'
import { blogs, type Blog, type InsertBlog } from '@/lib/db/schema'
import { and, count, desc, eq, ilike, or, sql, sum } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

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
        .select()
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
    data: Omit<InsertBlog, 'id'> & { id?: string }
  ): Promise<Blog> {
    const blogData = {
      ...data,
      id: data.id || uuidv4()
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
    data: Partial<InsertBlog>
  ): Promise<Blog | null> {
    const [updatedBlog] = await db
      .update(blogs)
      .set({
        ...data,
        updatedAt: new Date()
      })
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
