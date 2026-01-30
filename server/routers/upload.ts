import { generatePresignedUploadUrl } from '@/lib/s3'
import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'

export const uploadRouter = router({
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

      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ]
      if (!allowedTypes.includes(contentType)) {
        throw new Error(
          'Unsupported file type. Only JPEG, PNG, GIF, WebP are allowed'
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
})
