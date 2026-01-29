import { uploadApi, type PresignedUrlRequest } from '@/lib/api/upload'
import { useMutation } from '@tanstack/react-query'

// Get presigned URL for S3 upload
export function usePresignedUrl() {
  return useMutation({
    mutationFn: (data: PresignedUrlRequest) => uploadApi.getPresignedUrl(data)
  })
}

// Complete upload flow: get presigned URL and upload to S3
export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get presigned URL
      const { uploadUrl, publicUrl } = await uploadApi.getPresignedUrl({
        fileName: file.name,
        contentType: file.type
      })

      // Step 2: Upload to S3
      await uploadApi.uploadToS3(uploadUrl, file)

      // Return public URL
      return publicUrl
    }
  })
}
