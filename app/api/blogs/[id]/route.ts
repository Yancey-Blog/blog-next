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

/**
 * GET /api/blogs/[id] - Get a single blog post (public)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const [blog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, id))
      .limit(1)

    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
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

/**
 * PATCH /api/blogs/[id] - Update a blog post (requires authentication)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth()
    const { id } = await context.params

    // Check if blog exists
    const [existingBlog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, id))
      .limit(1)

    if (!existingBlog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
    }

    // Check if user is the author
    if (existingBlog.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'No permission to modify this blog' },
        { status: 403 }
      )
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

/**
 * DELETE /api/blogs/[id] - Delete a blog post (requires authentication)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth()
    const { id } = await context.params

    // Check if blog exists
    const [existingBlog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, id))
      .limit(1)

    if (!existingBlog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
    }

    // Check if user is the author
    if (existingBlog.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'No permission to delete this blog' },
        { status: 403 }
      )
    }

    await db.delete(blogs).where(eq(blogs.id, id))

    return NextResponse.json({ message: 'Deleted successfully' })
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
