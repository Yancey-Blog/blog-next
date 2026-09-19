'use client'

import { useMutation } from '@tanstack/react-query'
import { useCallback } from 'react'

import { useTRPC } from '@/lib/trpc/client'

/**
 * Upload a file straight to S3 and resolve to its public URL.
 *
 * JPEG and PNG uploads are finished on the server (`upload.processImage`),
 * which writes the AVIF/WebP/LQIP derivatives and returns the final URL with
 * the image dimensions in its file name. Expect that step to take a few seconds
 * for large photos. Rejects if any step fails.
 */
export function useUploadFile() {
  const trpc = useTRPC()
  const { mutateAsync: getPresignedUrl } = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )
  const { mutateAsync: processImage } = useMutation(
    trpc.upload.processImage.mutationOptions()
  )

  return useCallback(
    async (file: File): Promise<string> => {
      const { uploadUrl, publicUrl, fileKey, needsProcessing } =
        await getPresignedUrl({
          fileName: file.name,
          contentType: file.type
        })

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })
      if (!response.ok) throw new Error('Failed to upload to S3')

      if (!needsProcessing) return publicUrl

      const processed = await processImage({ fileKey })
      return processed.publicUrl
    },
    [getPresignedUrl, processImage]
  )
}
