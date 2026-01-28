import { db } from '@/lib/db'
import { blogs, type Blog, type InsertBlog } from '@/lib/db/schema'
import { and, desc, eq, ilike, ne, or } from 'drizzle-orm'

export interface GetBlogsOptions {
  page?: number
  pageSize?: number
  published?: boolean
  search?: string
  authorId?: string
}

export class BlogService {
  /**
   * 获取博客列表
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
   * 根据 ID 获取博客
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
   * 根据 slug 获取博客
   */
  static async getBlogBySlug(slug: string): Promise<Blog | null> {
    const [blog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.slug, slug))
      .limit(1)

    return blog || null
  }

  /**
   * 创建博客
   */
  static async createBlog(data: InsertBlog): Promise<Blog> {
    const [newBlog] = await db.insert(blogs).values(data).returning()

    return newBlog
  }

  /**
   * 更新博客
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
   * 删除博客
   */
  static async deleteBlog(id: string): Promise<boolean> {
    const result = await db.delete(blogs).where(eq(blogs.id, id)).returning()

    return result.length > 0
  }

  /**
   * 检查 slug 是否可用
   */
  static async isSlugAvailable(
    slug: string,
    excludeId?: string
  ): Promise<boolean> {
    const conditions = [eq(blogs.slug, slug)]

    // 如果提供了 excludeId，排除该博客（用于更新时检查）
    if (excludeId) {
      conditions.push(ne(blogs.id, excludeId))
    }

    const [existingBlog] = await db
      .select()
      .from(blogs)
      .where(and(...conditions))
      .limit(1)

    return !existingBlog
  }
}
