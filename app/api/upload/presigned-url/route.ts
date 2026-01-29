import { generatePresignedUploadUrl } from '@/lib/s3'
import { requireAuth } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 需要认证才能获取上传 URL
    await requireAuth()

    const body = await request.json()
    const { fileName, contentType } = body

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only JPEG, PNG, GIF, WebP are allowed' },
        { status: 400 }
      )
    }

    // 生成预签名 URL
    const { uploadUrl, publicUrl, fileKey } = await generatePresignedUploadUrl(
      fileName,
      contentType
    )

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      fileKey
    })
  } catch (error) {
    console.error('Generate presigned URL error:', error)
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
