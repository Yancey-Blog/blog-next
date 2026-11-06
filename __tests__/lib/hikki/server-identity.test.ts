import { createHash, generateKeyPairSync, verify } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type CloudKitConfig } from '@/lib/hikki/cloudkit'
import { serverIdentity } from '@/lib/hikki/server-identity'

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1'
})
const config: CloudKitConfig = {
  containerId: 'iCloud.fixture',
  environment: 'production',
  keyId: 'fixture-key',
  privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('CloudKit server identity', () => {
  it('falls back to the signed current-user endpoint when caller identity is unavailable', async () => {
    const response = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ users: [] }))
      .mockResolvedValueOnce(
        Response.json({
          userRecordName: '_fixture-server',
          firstName: 'Private name'
        })
      )
    expect(await serverIdentity(config, response)).toEqual({
      containerId: config.containerId,
      environment: config.environment,
      userRecordName: '_fixture-server'
    })
    const [url, init] = response.mock.calls[1] as [string, RequestInit]
    expect(url).toBe(
      'https://api.apple-cloudkit.com/database/1/iCloud.fixture/production/public/users/current'
    )
    expect(init.method).toBe('GET')
    expect(init).not.toHaveProperty('body')
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(
      'Private name'
    )
  })
  it('preserves authentication failures without trying another identity endpoint', async () => {
    const response = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { serverErrorCode: 'AUTHENTICATION_FAILED' },
          { status: 401 }
        )
      )
    await expect(serverIdentity(config, response)).rejects.toMatchObject({
      status: 401
    })
    expect(response).toHaveBeenCalledTimes(1)
  })
  it('signs a bodyless GET for its own identity and returns no credentials or profile data', async () => {
    const response = vi.fn().mockResolvedValue(
      Response.json({
        users: [
          {
            userRecordName: '_fixture-server',
            nameComponents: { givenName: 'Private name' }
          }
        ]
      })
    )
    expect(await serverIdentity(config, response)).toEqual({
      containerId: 'iCloud.fixture',
      environment: 'production',
      userRecordName: '_fixture-server'
    })
    const [url, init] = response.mock.calls[0] as [string, RequestInit]
    const path = '/database/1/iCloud.fixture/production/public/users/caller'
    expect(url).toBe('https://api.apple-cloudkit.com' + path)
    expect(init.method).toBe('GET')
    expect(init).not.toHaveProperty('body')
    const headers = new Headers(init.headers)
    const hash = createHash('sha256').update('').digest('base64')
    expect(
      verify(
        'sha256',
        Buffer.from(
          `${headers.get('X-Apple-CloudKit-Request-ISO8601Date')}:${hash}:${path}`
        ),
        publicKey,
        Buffer.from(
          headers.get('X-Apple-CloudKit-Request-SignatureV1')!,
          'base64'
        )
      )
    ).toBe(true)
  })
  it.each([
    { users: [] },
    { users: [{ userRecordName: '_a' }, { userRecordName: '_b' }] },
    { users: [{ userRecordName: 'invalid\nrecord' }] }
  ])('rejects an ambiguous or invalid caller response: %j', async (body) => {
    await expect(
      serverIdentity(config, vi.fn().mockResolvedValue(Response.json(body)))
    ).rejects.toMatchObject({ status: 502 })
  })
})
