import { db } from '@/lib/db'
import { blogs } from '@/lib/db/schema'
import { BlogVersionService } from '@/lib/services/blog-version.service'
import { requireAuth } from '@/lib/session'
import { updateBlogSchema } from '@/lib/validations/blog'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/blogs/[id] - 获取单个博客（公开）
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const [blog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, id))
      .limit(1)

    if (!blog) {
      return NextResponse.json({ error: '博客不存在' }, { status: 404 })
    }

    return NextResponse.json(blog)
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

// PATCH /api/blogs/[id] - 更新博客（需要认证）
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth()
    const { id } = await context.params

    // 检查博客是否存在
    const [existingBlog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, id))
      .limit(1)

    if (!existingBlog) {
      return NextResponse.json({ error: '博客不存在' }, { status: 404 })
    }

    // 检查是否是作者本人
    if (existingBlog.authorId !== session.user.id) {
      return NextResponse.json({ error: '无权限修改此博客' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateBlogSchema.parse(body)

    // Check if we need to create a version (when publishing)
    const shouldVersion =
      validatedData.published !== undefined &&
      BlogVersionService.shouldCreateVersion(
        existingBlog.published,
        validatedData.published
      )

    const [updatedBlog] = await db
      .update(blogs)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(blogs.id, id))
      .returning()

    // Create version if publishing
    if (shouldVersion) {
      await BlogVersionService.createVersion(
        id,
        session.user.id,
        'Published update'
      )
    }

    return NextResponse.json(updatedBlog)
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

// DELETE /api/blogs/[id] - 删除博客（需要认证）
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth()
    const { id } = await context.params

    // 检查博客是否存在
    const [existingBlog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, id))
      .limit(1)

    if (!existingBlog) {
      return NextResponse.json({ error: '博客不存在' }, { status: 404 })
    }

    // 检查是否是作者本人
    if (existingBlog.authorId !== session.user.id) {
      return NextResponse.json({ error: '无权限删除此博客' }, { status: 403 })
    }

    await db.delete(blogs).where(eq(blogs.id, id))

    return NextResponse.json({ message: '删除成功' })
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
