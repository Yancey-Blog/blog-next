import { generateKeyPairSync } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/hikki/config', () => ({ hikkiConfig: () => ({}) }))
vi.mock('@/lib/hikki/cloudkit', async (original) => ({
  ...(await original<typeof import('@/lib/hikki/cloudkit')>()),
  queryRecords: vi.fn()
}))

import {
  cloudKitRequest,
  CloudKitRequestError,
  modifyRecords,
  queryRecords,
  type CloudKitConfig
} from '@/lib/hikki/cloudkit'
import { createTRPCRouter, type createTRPCContext } from '@/lib/trpc/init'
import { hikkiRouter } from '@/lib/trpc/routers/hikki'

const privateKey = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  .privateKey.export({ format: 'pem', type: 'pkcs8' })
  .toString()
const config: CloudKitConfig = {
  containerId: 'iCloud.fixture',
  environment: 'development',
  keyId: 'fixture-key',
  privateKey
}
const router = createTRPCRouter({ hikki: hikkiRouter })
const admin = () =>
  router.createCaller({
    session: { id: 'fixture-session' },
    user: { id: 'owner', email: 'owner@example.com', emailVerified: true }
  } as unknown as Awaited<ReturnType<typeof createTRPCContext>>).hikki

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.mocked(queryRecords).mockReset()
})

describe('CloudKit operator diagnostics', () => {
  it('describes a failed write without exposing content, IDs, receipts or upstream values', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      modifyRecords(
        config,
        [
          {
            operationType: 'create',
            record: {
              recordName: 'private-record-id',
              recordType: 'PublishedPage',
              fields: {
                title: { value: 'private article text', type: 'STRING' },
                payloadFile: {
                  value: { receipt: 'private-asset-receipt' },
                  type: 'ASSET'
                },
                files: { value: null }
              }
            }
          }
        ],
        vi.fn().mockResolvedValue(
          Response.json(
            {
              serverErrorCode: 'BAD_REQUEST',
              reason: 'private-upstream-value'
            },
            { status: 400 }
          )
        )
      )
    ).rejects.toMatchObject({ status: 400 })
    const logged = JSON.stringify(log.mock.calls)
    for (const value of [
      'private-record-id',
      'private article text',
      'private-asset-receipt',
      'private-upstream-value'
    ])
      expect(logged).not.toContain(value)
    expect(JSON.parse(log.mock.calls[1][1] as string)).toEqual({
      operations: [
        {
          operation: 'create',
          recordType: 'PublishedPage',
          fields: [
            { name: 'title', type: 'STRING', kind: 'string' },
            { name: 'payloadFile', type: 'ASSET', kind: 'object' },
            { name: 'files', type: 'inferred', kind: 'null' }
          ]
        }
      ]
    })
  })
  it('keeps query/schema feedback bounded while redacting URLs and opaque values', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const reason =
      'Invalid query for status https://example.test?secret=abc ' +
      'a'.repeat(64)
    const response = vi.fn().mockResolvedValue(
      Response.json(
        {
          serverErrorCode: 'BAD_REQUEST',
          reason
        },
        { status: 400 }
      )
    )
    await expect(
      cloudKitRequest(config, 'records/query', {}, response)
    ).rejects.toMatchObject({
      queryReason: 'Invalid query for status [URL] [value]'
    })
    const logged = JSON.stringify(log.mock.calls)
    expect(logged).not.toContain('secret=abc')
    expect(logged).not.toContain('a'.repeat(64))
    expect(
      new CloudKitRequestError(400, { reason: 'x '.repeat(400) }).queryReason
        ?.length
    ).toBe(300)
  })
  it('logs only the operation, HTTP status and code, excluding upstream reason and credentials', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const response = vi.fn().mockResolvedValue(
      Response.json(
        {
          serverErrorCode: 'AUTHENTICATION_FAILED',
          reason: 'fixture-sensitive-detail'
        },
        { status: 401 }
      )
    )
    await expect(
      cloudKitRequest(
        config,
        'records/query',
        { private: 'fixture-record-content' },
        response
      )
    ).rejects.toMatchObject({
      status: 401,
      serverCode: 'AUTHENTICATION_FAILED'
    })
    expect(log.mock.calls).toEqual([
      [
        'Hikki CloudKit request failed',
        {
          operation: 'records/query',
          status: 401,
          code: 'AUTHENTICATION_FAILED'
        }
      ]
    ])
  })
  it('preserves an Apple error code returned inside an HTTP-success response', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      cloudKitRequest(
        config,
        'records/query',
        {},
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ serverErrorCode: 'ACCESS_DENIED' })
          )
      )
    ).rejects.toMatchObject({ status: 502, serverCode: 'ACCESS_DENIED' })
  })
  it('gives the verified administrator a key-specific recovery message for failed authentication', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    vi.mocked(queryRecords).mockRejectedValue(
      new CloudKitRequestError(401, {
        serverErrorCode: 'AUTHENTICATION_FAILED',
        reason: 'fixture-sensitive-detail'
      })
    )
    await expect(admin().devices()).rejects.toThrow(
      'Check the CMS key ID and matching private key.'
    )
  })
  it('distinguishes missing moderator permission from an invalid server key', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    vi.mocked(queryRecords).mockRejectedValue(
      new CloudKitRequestError(502, {
        serverErrorCode: 'ACCESS_DENIED',
        reason: 'fixture-sensitive-detail'
      })
    )
    await expect(admin().queue()).rejects.toThrow('HikkiModerator role')
  })
})
