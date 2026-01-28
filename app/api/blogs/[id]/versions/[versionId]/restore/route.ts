import { BlogVersionService } from '@/lib/services/blog-version.service'
import { requireAuth } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>
}

// POST /api/blogs/[id]/versions/[versionId]/restore - 恢复到指定版本
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth()
    const { id, versionId } = await context.params

    await BlogVersionService.restoreVersion(id, versionId, session.user.id)

    return NextResponse.json({ message: '版本恢复成功' })
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
