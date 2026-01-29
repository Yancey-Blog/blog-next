import { BlogVersionService } from '@/lib/services/blog-version.service'
import { DiffService } from '@/lib/services/diff.service'
import { requireAuth } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>
}

// GET /api/blogs/[id]/versions/[versionId]/diff?compareWith=versionId
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()

    const { versionId } = await context.params
    const { searchParams } = request.nextUrl
    const compareWithId = searchParams.get('compareWith')

    if (!compareWithId) {
      return NextResponse.json(
        { error: 'compareWith parameter is required' },
        { status: 400 }
      )
    }

    // Get both versions
    const [version1, version2] = await Promise.all([
      BlogVersionService.getVersion(versionId),
      BlogVersionService.getVersion(compareWithId)
    ])

    if (!version1 || !version2) {
      return NextResponse.json(
        { error: 'One or both versions not found' },
        { status: 404 }
      )
    }

    // Verify both versions belong to the same blog
    if (version1.blogId !== version2.blogId) {
      return NextResponse.json(
        { error: 'Versions belong to different blogs' },
        { status: 400 }
      )
    }

    // Generate diff
    const diff = DiffService.compareBlogVersions(
      {
        title: version1.title,
        summary: version1.summary,
        content: version1.content,
        coverImage: version1.coverImage
      },
      {
        title: version2.title,
        summary: version2.summary,
        content: version2.content,
        coverImage: version2.coverImage
      }
    )

    return NextResponse.json({
      diff,
      version1: {
        id: version1.id,
        version: version1.version,
        createdAt: version1.createdAt
      },
      version2: {
        id: version2.id,
        version: version2.version,
        createdAt: version2.createdAt
      }
    })
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
