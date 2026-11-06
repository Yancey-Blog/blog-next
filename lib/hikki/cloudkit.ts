// Hikki CloudKit transport, kept server-side in the CMS.
import { createHash, createPrivateKey, sign } from 'node:crypto'

/** Server-to-server access to the public CloudKit database. Credentials are deployment env vars only. */
export type CloudKitConfig = {
  containerId: string
  environment: 'development' | 'production'
  keyId: string
  privateKey: string
}

export class CloudKitRequestError extends Error {
  /** Safe schema/query detail for the protected administrator UI only. */
  get queryReason(): string | null {
    if (
      this.status !== 400 ||
      !this.body ||
      typeof this.body !== 'object' ||
      !('reason' in this.body)
    )
      return null
    const reason = this.body.reason
    if (typeof reason !== 'string') return null
    return reason
      .replace(/https?:\/\/\S+/giu, '[URL]')
      .replace(/[A-Za-z0-9+/_=-]{32,}/gu, '[value]')
      .replace(/\s+/gu, ' ')
      .slice(0, 300)
  }
  get serverCode(): string | null {
    const code =
      this.body &&
      typeof this.body === 'object' &&
      'serverErrorCode' in this.body
        ? this.body.serverErrorCode
        : null
    return typeof code === 'string' && /^[A-Z_]{1,64}$/.test(code) ? code : null
  }
  constructor(
    readonly status: number,
    readonly body?: unknown
  ) {
    super(`CloudKit request failed (${status})`)
    this.name = 'CloudKitRequestError'
  }
}

const BASE_URL = 'https://api.apple-cloudkit.com'
const TIMEOUT_MS = 8_000

export type CloudKitCredentials = {
  /** Public environment name already used by the reader; read at runtime by the server. */
  VITE_CLOUDKIT_ENV?: string
  CLOUDKIT_CONTAINER_ID?: string
  /** Compatibility with the earlier setup guide. Conflicting values fail closed. */
  CLOUDKIT_ENVIRONMENT?: string
  CLOUDKIT_KEY_ID?: string
  CLOUDKIT_PRIVATE_KEY_BASE64?: string
}

/** Read secrets at runtime. Only public configuration may use the VITE_ prefix. */
export function cloudKitConfig(
  env: CloudKitCredentials
): CloudKitConfig | null {
  const { CLOUDKIT_KEY_ID, CLOUDKIT_PRIVATE_KEY_BASE64 } = env
  if (
    env.VITE_CLOUDKIT_ENV &&
    env.CLOUDKIT_ENVIRONMENT &&
    env.VITE_CLOUDKIT_ENV !== env.CLOUDKIT_ENVIRONMENT
  )
    return null
  const environment =
    env.VITE_CLOUDKIT_ENV ?? env.CLOUDKIT_ENVIRONMENT ?? 'production'
  const containerId = env.CLOUDKIT_CONTAINER_ID ?? 'iCloud.app.yancey.hikki'
  if (
    !containerId ||
    !CLOUDKIT_KEY_ID ||
    !CLOUDKIT_PRIVATE_KEY_BASE64 ||
    (environment !== 'development' && environment !== 'production')
  )
    return null
  try {
    const privateKey = Buffer.from(
      CLOUDKIT_PRIVATE_KEY_BASE64,
      'base64'
    ).toString('utf8')
    createPrivateKey(privateKey)
    return {
      containerId,
      keyId: CLOUDKIT_KEY_ID,
      environment,
      privateKey
    }
  } catch {
    return null
  }
}

/** Signed JSON request. `operationPath` is a fixed CloudKit Web Services path, e.g. `records/query`. */
export async function cloudKitRequest<T>(
  config: CloudKitConfig,
  operationPath: string,
  body: unknown,
  fetcher: typeof fetch = fetch
): Promise<T> {
  if (!/^[a-z/]+$/u.test(operationPath))
    throw new TypeError('Invalid CloudKit operation path')
  const path = `/database/1/${config.containerId}/${config.environment}/public/${operationPath}`
  // Apple's caller identity endpoint is GET; sign the empty body actually sent.
  const identityRequest =
    operationPath === 'users/caller' || operationPath === 'users/current'
  const bodyText = identityRequest ? '' : JSON.stringify(body)
  const date = new Date().toISOString().replace(/\.\d{3}Z$/u, 'Z')
  const bodyHash = createHash('sha256').update(bodyText).digest('base64')
  const message = `${date}:${bodyHash}:${path}`
  const signature = sign(
    'sha256',
    Buffer.from(message),
    createPrivateKey(config.privateKey)
  ).toString('base64')

  let response: Response
  try {
    response = await fetcher(`${BASE_URL}${path}`, {
      method: identityRequest ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Apple-CloudKit-Request-KeyID': config.keyId,
        'X-Apple-CloudKit-Request-ISO8601Date': date,
        'X-Apple-CloudKit-Request-SignatureV1': signature
      },
      ...(identityRequest ? {} : { body: bodyText }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
  } catch {
    console.warn('Hikki CloudKit request failed', {
      operation: operationPath,
      status: 503,
      code: 'TRANSPORT_FAILED'
    })
    throw new CloudKitRequestError(503)
  }
  const result: unknown = await response.json().catch(() => null)
  if (
    !response.ok ||
    !result ||
    typeof result !== 'object' ||
    'serverErrorCode' in result
  ) {
    const failure = new CloudKitRequestError(
      response.ok ? 502 : response.status,
      result
    )
    // Never log credentials, request bodies or record content. Query hints are bounded and redacted.
    console.warn('Hikki CloudKit request failed', {
      operation: operationPath,
      status: failure.status,
      code: failure.serverCode,
      ...(failure.status === 400 && operationPath === 'records/query'
        ? { queryReason: failure.queryReason }
        : {})
    })
    throw failure
  }
  return result as T
}

export type CloudKitField = { value?: unknown; type?: string }
export type CloudKitRecord = {
  recordName: string
  recordType: string
  recordChangeTag?: string
  created?: { timestamp?: number; userRecordName?: string }
  modified?: { timestamp?: number; userRecordName?: string }
  fields?: Record<string, CloudKitField>
}

export async function lookupRecord(
  config: CloudKitConfig,
  recordType: string,
  recordName: string,
  fetcher?: typeof fetch
): Promise<CloudKitRecord | null> {
  const result = await cloudKitRequest<{ records?: CloudKitRecord[] }>(
    config,
    'records/lookup',
    { records: [{ recordType, recordName }] },
    fetcher
  )
  const record = result.records?.[0]
  if (!record) throw new CloudKitRequestError(502)
  if ('serverErrorCode' in record) {
    if (record.serverErrorCode === 'NOT_FOUND') return null
    throw new CloudKitRequestError(502, record)
  }
  return record.recordType === recordType ? record : null
}

export async function queryRecords(
  config: CloudKitConfig,
  recordType: string,
  options: {
    filterBy?: Array<{
      fieldName: string
      comparator: string
      fieldValue: { value: unknown; type: string }
    }>
    sortBy?: Array<{ fieldName: string; ascending: boolean }>
    limit?: number
    marker?: string | null
    desiredKeys?: string[]
  } = {},
  fetcher?: typeof fetch
): Promise<{ records: CloudKitRecord[]; marker: string | null }> {
  const result = await cloudKitRequest<{
    records?: CloudKitRecord[]
    continuationMarker?: string | null
  }>(
    config,
    'records/query',
    {
      query: {
        recordType,
        ...(options.filterBy ? { filterBy: options.filterBy } : {}),
        ...(options.sortBy ? { sortBy: options.sortBy } : {})
      },
      resultsLimit: options.limit ?? 50,
      ...(options.desiredKeys ? { desiredKeys: options.desiredKeys } : {}),
      ...(options.marker ? { continuationMarker: options.marker } : {})
    },
    fetcher
  )
  if (!Array.isArray(result.records)) throw new CloudKitRequestError(502)
  return { records: result.records, marker: result.continuationMarker ?? null }
}

export async function modifyRecords(
  config: CloudKitConfig,
  operations: Array<Record<string, unknown>>,
  fetcher?: typeof fetch
): Promise<CloudKitRecord[]> {
  let result: { records?: CloudKitRecord[] }
  try {
    result = await cloudKitRequest(
      config,
      'records/modify',
      { operations },
      fetcher
    )
  } catch (error) {
    // Describe the wire schema only. Never log record IDs, content, asset receipts or field values.
    console.warn(
      'Hikki CloudKit write shape',
      JSON.stringify({
        operations: operations.slice(0, 10).map((operation) => {
          const record = operation.record as CloudKitRecord | undefined
          return {
            operation: operation.operationType,
            recordType: record?.recordType,
            fields: Object.entries(record?.fields ?? {})
              .slice(0, 30)
              .map(([name, field]) => ({
                name,
                type: field.type ?? 'inferred',
                kind:
                  field.value === null
                    ? 'null'
                    : Array.isArray(field.value)
                      ? 'array'
                      : typeof field.value
              }))
          }
        })
      })
    )
    throw error
  }
  const records = result.records ?? []
  if (records.length !== operations.length) throw new CloudKitRequestError(502)
  const failure = records.find((record) => 'serverErrorCode' in record)
  if (failure) throw new CloudKitRequestError(409, failure)
  return records
}

export async function rereferenceAssets(
  config: CloudKitConfig,
  recordName: string,
  fields: string[],
  fetcher?: typeof fetch
): Promise<unknown[]> {
  const result = await cloudKitRequest<{ assets?: unknown[] }>(
    config,
    'assets/rereference',
    { assets: fields.map((fieldName) => ({ recordName, fieldName })) },
    fetcher
  )
  return result.assets ?? []
}
