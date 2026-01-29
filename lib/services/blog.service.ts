import { db } from '@/lib/db'
import { blogs, type Blog, type InsertBlog } from '@/lib/db/schema'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
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
   * Delete a blog
   */
  static async deleteBlog(id: string): Promise<boolean> {
    const result = await db.delete(blogs).where(eq(blogs.id, id)).returning()

    return result.length > 0
  }
}
