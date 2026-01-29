import { apiClient } from '@/lib/api-client'

export interface PresignedUrlRequest {
  fileName: string
  contentType: string
}

export interface PresignedUrlResponse {
  uploadUrl: string
  publicUrl: string
  fileKey: string
}

export const uploadApi = {
  // Get presigned URL for S3 upload
  getPresignedUrl: (data: PresignedUrlRequest) =>
    apiClient.post<PresignedUrlResponse>('/api/upload/presigned-url', data),

  // Upload file directly to S3
  uploadToS3: async (uploadUrl: string, file: File) => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type
      },
      body: file
    })

    if (!response.ok) {
      throw new Error('Failed to upload to S3')
    }

    return response
  }
}
