import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand
} from '@aws-sdk/client-s3'

import { s3Client } from '@/lib/s3'

import type { ObjectStore } from './process'

/** Originals and derivatives never change once written, so cache them for a year. */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

const bucket = () => process.env.AWS_S3_BUCKET_NAME as string

/** CopySource must be URL-encoded; slashes between segments stay literal. */
const encodeKey = (key: string) =>
  key.split('/').map(encodeURIComponent).join('/')

export const s3ObjectStore: ObjectStore = {
  async get(key) {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
    )
    if (!response.Body) throw new Error(`Empty S3 object: ${key}`)
    return Buffer.from(await response.Body.transformToByteArray())
  },

  async put(key, body, contentType) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: IMMUTABLE_CACHE_CONTROL
      })
    )
  },

  // Also used to repair metadata in place: S3 allows copying an object onto
  // itself as long as the metadata is replaced.
  async copy(fromKey, toKey, contentType) {
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: bucket(),
        Key: toKey,
        CopySource: `${bucket()}/${encodeKey(fromKey)}`,
        MetadataDirective: 'REPLACE',
        ContentType: contentType,
        CacheControl: IMMUTABLE_CACHE_CONTROL
      })
    )
  },

  async delete(key) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))
  }
}

function isNotFound(error: unknown): boolean {
  const candidate = error as {
    name?: string
    $metadata?: { httpStatusCode?: number }
  }
  return (
    candidate?.name === 'NotFound' ||
    candidate?.$metadata?.httpStatusCode === 404
  )
}

/** Null when the object does not exist; other errors propagate. */
export async function headObject(
  key: string
): Promise<{ contentType: string | undefined } | null> {
  try {
    const response = await s3Client.send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key })
    )
    return { contentType: response.ContentType }
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

/** Every key in the bucket, across all pages. */
export async function listAllKeys(): Promise<string[]> {
  const keys: string[] = []
  let token: string | undefined
  do {
    const response = await s3Client.send(
      new ListObjectsV2Command({ Bucket: bucket(), ContinuationToken: token })
    )
    for (const object of response.Contents ?? []) {
      if (object.Key) keys.push(object.Key)
    }
    token = response.NextContinuationToken
  } while (token)
  return keys
}
