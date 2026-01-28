import { BlogVersionService } from '@/lib/services/blog-version.service'
import { requireAuth } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>
}

// GET /api/blogs/[id]/versions/[versionId] - 获取特定版本
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()

    const { versionId } = await context.params
    const version = await BlogVersionService.getVersion(versionId)

    if (!version) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 })
    }

    return NextResponse.json(version)
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
