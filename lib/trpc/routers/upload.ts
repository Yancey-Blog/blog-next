import { z } from 'zod'

import { TMP_KEY_PATTERN } from '@/lib/images/derivatives'
import { processUploadedImage } from '@/lib/images/process'
import { s3ObjectStore } from '@/lib/images/s3-store'
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

      const { uploadUrl, publicUrl, fileKey, needsProcessing } =
        await generatePresignedUploadUrl(fileName, contentType)

      return {
        uploadUrl,
        publicUrl,
        fileKey,
        needsProcessing
      }
    }),

  // Finish a JPEG/PNG upload: write AVIF/WebP tiers and the LQIP, then move the
  // original out of tmp/. Runs synchronously so a URL is only handed out once
  // its derivatives exist, and so failures surface in the uploader right away.
  processImage: protectedProcedure
    .input(
      z.object({
        // Only keys issued by getPresignedUrl; never arbitrary bucket objects.
        fileKey: z.string().regex(TMP_KEY_PATTERN)
      })
    )
    .mutation(async ({ input }) => {
      const { publicUrl, width, height } = await processUploadedImage(
        s3ObjectStore,
        input.fileKey
      )
      return { publicUrl, width, height }
    })
}
