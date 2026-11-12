import {
  cloudKitRequest,
  CloudKitRequestError,
  type CloudKitConfig
} from './cloudkit'

const MAX_BYTES = 20 * 1024 * 1024
const MAX_FILE_BYTES = 15 * 1024 * 1024
const TIMEOUT_MS = 8_000

function appleURL(value: unknown, uploading = false): string {
  if (typeof value !== 'string') throw new CloudKitRequestError(502)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new CloudKitRequestError(502)
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !(
      url.hostname.endsWith('.icloud-content.com') ||
      (uploading && url.hostname.endsWith('.icloud.com'))
    )
  )
    throw new CloudKitRequestError(502)
  return url.href
}

async function boundedBytes(
  response: Response,
  expected: number
): Promise<ArrayBuffer> {
  if (!response.ok || !response.body) throw new CloudKitRequestError(502)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > expected) throw new CloudKitRequestError(502)
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  if (length !== expected) throw new CloudKitRequestError(502)
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes.buffer
}

/** ASSET_LIST cannot be re-referenced as one asset. Copy each immutable attachment in order. */
export async function copyAttachmentAssets(
  config: CloudKitConfig,
  recordName: string,
  assets: unknown[],
  fetcher: typeof fetch = fetch
): Promise<Record<string, unknown>[]> {
  let total = 0
  const files = assets.map((asset) => {
    if (!asset || typeof asset !== 'object') throw new CloudKitRequestError(502)
    const raw = asset as Record<string, unknown>
    const size = raw.size
    if (
      typeof size !== 'number' ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > MAX_FILE_BYTES ||
      typeof raw.fileChecksum !== 'string' ||
      !raw.fileChecksum
    )
      throw new CloudKitRequestError(502)
    total += size
    return { url: appleURL(raw.downloadURL), size, checksum: raw.fileChecksum }
  })
  if (files.length > 100 || total > MAX_BYTES)
    throw new CloudKitRequestError(502)
  if (!files.length) return []
  const response = await cloudKitRequest<{
    tokens?: Array<{ url?: unknown; serverErrorCode?: unknown }>
  }>(
    config,
    'assets/upload',
    {
      tokens: files.map(() => ({
        recordType: 'PublishedPage',
        recordName,
        fieldName: 'files'
      }))
    },
    fetcher
  )
  if (
    !Array.isArray(response.tokens) ||
    response.tokens.length !== files.length
  )
    throw new CloudKitRequestError(502)
  const urls = response.tokens.map((token) => {
    if (token.serverErrorCode) throw new CloudKitRequestError(502, token)
    return appleURL(token.url, true)
  })
  const results: Record<string, unknown>[] = Array.from(
    { length: files.length },
    () => ({})
  )
  // Two bounded streams avoid loading every attachment at once and preserve list order.
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(2, files.length) }, async () => {
      while (next < files.length) {
        const index = next++,
          file = files[index]
        const download = await fetcher(file.url, {
          redirect: 'error',
          signal: AbortSignal.timeout(TIMEOUT_MS)
        })
        const bytes = await boundedBytes(download, file.size)
        const upload = await fetcher(urls[index], {
          method: 'POST',
          body: bytes,
          redirect: 'error',
          signal: AbortSignal.timeout(TIMEOUT_MS)
        })
        const result: unknown = await upload.json().catch(() => null)
        const receipt =
          result && typeof result === 'object' && 'singleFile' in result
            ? result.singleFile
            : null
        if (!upload.ok || !receipt || typeof receipt !== 'object')
          throw new CloudKitRequestError(502)
        const raw = receipt as Record<string, unknown>
        if (
          raw.fileChecksum !== file.checksum ||
          raw.size !== file.size ||
          typeof raw.receipt !== 'string' ||
          !raw.receipt
        )
          throw new CloudKitRequestError(502)
        results[index] = {
          fileChecksum: raw.fileChecksum,
          size: raw.size,
          receipt: raw.receipt,
          ...(typeof raw.referenceChecksum === 'string'
            ? { referenceChecksum: raw.referenceChecksum }
            : {}),
          ...(typeof raw.wrappingKey === 'string'
            ? { wrappingKey: raw.wrappingKey }
            : {})
        }
      }
    })
  )
  return results
}
