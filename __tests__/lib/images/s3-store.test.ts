import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand
} from '@aws-sdk/client-s3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))

// lib/s3.ts throws at import time without AWS env vars, so replace it.
vi.mock('@/lib/s3', () => ({ s3Client: { send } }))

import {
  headObject,
  IMMUTABLE_CACHE_CONTROL,
  listAllKeys,
  s3ObjectStore
} from '@/lib/images/s3-store'

beforeEach(() => {
  send.mockReset()
  process.env.AWS_S3_BUCKET_NAME = 'test-bucket'
})

describe('s3ObjectStore', () => {
  it('puts with content type and an immutable cache header', async () => {
    send.mockResolvedValue({})
    await s3ObjectStore.put(
      '_derived/a.jpeg/w480.avif',
      Buffer.from('x'),
      'image/avif'
    )

    const command = send.mock.calls[0][0]
    expect(command).toBeInstanceOf(PutObjectCommand)
    expect(command.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: '_derived/a.jpeg/w480.avif',
      ContentType: 'image/avif',
      CacheControl: IMMUTABLE_CACHE_CONTROL
    })
    expect(IMMUTABLE_CACHE_CONTROL).toBe('public, max-age=31536000, immutable')
  })

  it('copies with replaced metadata and a URL-encoded source', async () => {
    send.mockResolvedValue({})
    await s3ObjectStore.copy('tmp/a b.jpeg', 'a b_1x1.jpeg', 'image/jpeg')

    const command = send.mock.calls[0][0]
    expect(command).toBeInstanceOf(CopyObjectCommand)
    expect(command.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'a b_1x1.jpeg',
      CopySource: 'test-bucket/tmp/a%20b.jpeg',
      MetadataDirective: 'REPLACE',
      ContentType: 'image/jpeg',
      CacheControl: IMMUTABLE_CACHE_CONTROL
    })
  })

  it('reads an object body into a Buffer', async () => {
    send.mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) }
    })
    const body = await s3ObjectStore.get('a.jpeg')
    expect(Buffer.isBuffer(body)).toBe(true)
    expect([...body]).toEqual([1, 2, 3])
  })

  it('deletes by key', async () => {
    send.mockResolvedValue({})
    await s3ObjectStore.delete('tmp/a.jpeg')
    const command = send.mock.calls[0][0]
    expect(command).toBeInstanceOf(DeleteObjectCommand)
    expect(command.input).toEqual({ Bucket: 'test-bucket', Key: 'tmp/a.jpeg' })
  })
})

describe('headObject', () => {
  it('returns the content type when the object exists', async () => {
    send.mockResolvedValue({ ContentType: 'application/octet-stream' })
    expect(await headObject('a.jpeg')).toEqual({
      contentType: 'application/octet-stream'
    })
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand)
  })

  it('returns null when the object does not exist', async () => {
    send.mockRejectedValue(
      Object.assign(new Error('nope'), {
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 }
      })
    )
    expect(await headObject('missing.jpeg')).toBeNull()
  })

  it('rethrows other errors', async () => {
    send.mockRejectedValue(
      Object.assign(new Error('denied'), {
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 }
      })
    )
    await expect(headObject('a.jpeg')).rejects.toThrow('denied')
  })
})

describe('listAllKeys', () => {
  it('follows continuation tokens', async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: 'a.jpeg' }, { Key: 'b.png' }],
        NextContinuationToken: 'page-2'
      })
      .mockResolvedValueOnce({ Contents: [{ Key: 'c.gif' }] })

    expect(await listAllKeys()).toEqual(['a.jpeg', 'b.png', 'c.gif'])
    expect(send.mock.calls[0][0]).toBeInstanceOf(ListObjectsV2Command)
    expect(send.mock.calls[1][0].input.ContinuationToken).toBe('page-2')
  })
})
