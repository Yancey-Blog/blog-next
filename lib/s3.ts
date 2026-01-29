import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

if (!process.env.AWS_REGION) {
  throw new Error('AWS_REGION is not defined')
}

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error('AWS_ACCESS_KEY_ID is not defined')
}

if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS_SECRET_ACCESS_KEY is not defined')
}

if (!process.env.AWS_S3_BUCKET_NAME) {
  throw new Error('AWS_S3_BUCKET_NAME is not defined')
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

/**
 * Generate presigned URL for file upload
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  const fileExtension = fileName.split('.').pop()
  const fileKey = `blog-images/${uuidv4()}.${fileExtension}`

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600 // 1 hour
  })

  const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`

  return {
    uploadUrl,
    fileKey,
    publicUrl
  }
}

/**
 * Upload file directly to S3
 */
export async function uploadFileToS3(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const fileExtension = fileName.split('.').pop()
  const fileKey = `blog-images/${uuidv4()}.${fileExtension}`

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
    Body: file,
    ContentType: contentType
  })

  await s3Client.send(command)

  const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`

  return publicUrl
}
