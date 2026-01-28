import { db } from '@/db'
import { blogs } from '@/db/schema'
import { requireAuth } from '@/lib/session'
import { createBlogSchema, getBlogsQuerySchema } from '@/lib/validations/blog'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/blogs - 获取博客列表（公开）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const query = getBlogsQuerySchema.parse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      published: searchParams.get('published'),
      search: searchParams.get('search')
    })

    const { page, pageSize, published, search } = query
    const offset = (page - 1) * pageSize

    // 构建查询条件
    const conditions = []

    // 如果指定了 published 参数，则过滤
    if (published !== undefined) {
      conditions.push(eq(blogs.published, published))
    }

    // 如果有搜索关键词
    if (search) {
      conditions.push(
        or(
          ilike(blogs.title, `%${search}%`),
          ilike(blogs.content, `%${search}%`)
        )
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const result = await db
      .select()
      .from(blogs)
      .where(whereClause)
      .orderBy(desc(blogs.createdAt))
      .limit(pageSize)
      .offset(offset)

    return NextResponse.json({
      data: result,
      pagination: {
        page,
        pageSize,
        total: result.length
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/blogs - 创建博客（需要认证）
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const validatedData = createBlogSchema.parse(body)

    // 检查 slug 是否已存在
    const existingBlog = await db
      .select()
      .from(blogs)
      .where(eq(blogs.slug, validatedData.slug))
      .limit(1)

    if (existingBlog.length > 0) {
      return NextResponse.json({ error: '该 slug 已存在' }, { status: 409 })
    }

    const [newBlog] = await db
      .insert(blogs)
      .values({
        ...validatedData,
        authorId: session.user.id
      })
      .returning()

    return NextResponse.json(newBlog, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: '未授权' }, { status: 401 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
