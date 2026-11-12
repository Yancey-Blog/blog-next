import { generateKeyPairSync } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import { copyAttachmentAssets } from '@/lib/hikki/attachment-assets'
import type { CloudKitConfig } from '@/lib/hikki/cloudkit'

const config: CloudKitConfig = {
  containerId: 'iCloud.fixture',
  environment: 'development',
  keyId: 'fixture',
  privateKey: generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    .privateKey.export({ format: 'pem', type: 'pkcs8' })
    .toString()
}
const files = Array.from({ length: 7 }, (_, i) => ({
  size: 3,
  fileChecksum: `checksum-${i}`,
  downloadURL: `https://assets.icloud-content.com/file-${i}`
}))
function transport(
  options: {
    oversized?: boolean
    tokenHost?: string
    badReceipt?: boolean
    itemError?: boolean
  } = {}
) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    if (url.endsWith('/assets/upload')) {
      expect(JSON.parse(init!.body as string).tokens).toHaveLength(7)
      return Response.json({
        tokens: files.map((_, i) =>
          options.itemError
            ? { serverErrorCode: 'BAD_REQUEST' }
            : {
                url: `https://${options.tokenHost ?? 'upload.icloud.com'}/file-${i}`
              }
        )
      })
    }
    const index = Number(url.split('-').at(-1))
    if (init?.method === 'POST') {
      expect(Array.from(new Uint8Array(init.body as ArrayBuffer))).toEqual([
        index,
        2,
        3
      ])
      return Response.json({
        singleFile: {
          fileChecksum: options.badReceipt ? 'wrong' : `checksum-${index}`,
          size: 3,
          receipt: `receipt-${index}`,
          downloadURL: 'read-only-metadata'
        }
      })
    }
    expect(init?.redirect).toBe('error')
    return new Response(
      new Uint8Array(options.oversized ? [index, 2, 3, 4] : [index, 2, 3])
    )
  }) as unknown as typeof fetch
}
describe('attachment publication', () => {
  it('copies all seven list entries in order with only writable receipts', async () => {
    const fetcher = transport()
    const receipts = await copyAttachmentAssets(
      config,
      'page-fixture',
      files,
      fetcher
    )
    expect(receipts).toEqual(
      files.map((f, i) => ({
        size: 3,
        fileChecksum: f.fileChecksum,
        receipt: `receipt-${i}`
      }))
    )
    expect(fetcher).toHaveBeenCalledTimes(15)
  })
  it.each([
    { oversized: true },
    { tokenHost: 'attacker.test' },
    { badReceipt: true },
    { itemError: true }
  ])('rejects invalid upstream copies: %j', async (options) => {
    await expect(
      copyAttachmentAssets(config, 'page-fixture', files, transport(options))
    ).rejects.toThrow('502')
  })
  it('rejects untrusted URLs and total byte limits before sending a request', async () => {
    const fetcher = vi.fn()
    for (const bad of [
      files.map((f) => ({ ...f, downloadURL: 'https://attacker.test/file' })),
      files.map((f) => ({ ...f, size: 4 * 1024 * 1024 }))
    ]) {
      await expect(
        copyAttachmentAssets(config, 'page-fixture', bad, fetcher)
      ).rejects.toThrow('502')
    }
    expect(fetcher).not.toHaveBeenCalled()
  })
})
