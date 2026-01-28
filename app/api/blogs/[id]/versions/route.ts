import { BlogVersionService } from '@/lib/services/blog-version.service'
import { requireAuth } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/blogs/[id]/versions - 获取版本历史
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()

    const { id } = await context.params
    const versions = await BlogVersionService.getVersions(id)

    return NextResponse.json(versions)
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

// POST /api/blogs/[id]/versions - 创建版本快照
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth()
    const { id } = await context.params

    const body = await request.json()
    const { changeNote } = z
      .object({
        changeNote: z.string().optional()
      })
      .parse(body)

    const version = await BlogVersionService.createVersion(
      id,
      session.user.id,
      changeNote
    )

    return NextResponse.json(version, { status: 201 })
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
