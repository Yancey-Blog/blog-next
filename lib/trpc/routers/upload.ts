import { z } from 'zod'

import { generatePresignedUploadUrl } from '@/lib/s3'

import { protectedProcedure } from '../init'

export const uploadRouter = {
  // Get presigned URL for S3 upload
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        contentType: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const { fileName, contentType } = input

      // Validate file type (images + videos for the Meiji media feed)
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/ogg'
      ]
      if (!allowedTypes.includes(contentType)) {
        throw new Error(
          'Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV, OGG'
        )
      }

      const { uploadUrl, publicUrl, fileKey } =
        await generatePresignedUploadUrl(fileName, contentType)

      return {
        uploadUrl,
        publicUrl,
        fileKey
      }
    })
}
