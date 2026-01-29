import { uploadFileToS3 } from '@/lib/s3'
import { requireAuth } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Require authentication for upload
    await requireAuth()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Unsupported file type. Only JPEG, PNG, GIF, WebP are allowed'
        },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      )
    }

    // Convert to Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to S3
    const publicUrl = await uploadFileToS3(buffer, file.name, file.type)

    return NextResponse.json({
      url: publicUrl,
      fileName: file.name,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('Upload error:', error)
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
