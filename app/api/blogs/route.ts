import { db } from '@/lib/db'
import { blogs } from '@/lib/db/schema'
import { BlogVersionService } from '@/lib/services/blog-version.service'
import { BlogService } from '@/lib/services/blog.service'
import { requireAuth } from '@/lib/session'
import { createBlogSchema, getBlogsQuerySchema } from '@/lib/validations/blog'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/blogs - Get list of blogs (public)
 * Supports pagination, filtering by published status, and search
 */
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

    // Build query conditions
    const conditions = []

    // Filter by published status if specified
    if (published !== undefined) {
      conditions.push(eq(blogs.published, published))
    }

    // Add search filter if search term provided
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

/**
 * POST /api/blogs - Create a new blog (requires authentication)
 * Automatically creates version snapshot if published
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const validatedData = createBlogSchema.parse(body)

    // Create blog with UUID
    const newBlog = await BlogService.createBlog({
      ...validatedData,
      authorId: session.user.id
    })

    // Create version if publishing
    if (validatedData.published) {
      await BlogVersionService.createVersion(
        newBlog.id,
        session.user.id,
        'Initial publish'
      )
    }

    return NextResponse.json(newBlog, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
