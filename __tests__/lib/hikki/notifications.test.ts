import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CloudKitConfig } from '@/lib/hikki/cloudkit'
const state = vi.hoisted(() => ({ records: new Map<string, any>() }))
vi.mock('@/lib/hikki/cloudkit', () => ({
  lookupRecord: async (_: unknown, type: string, id: string) => {
    const record = state.records.get(id)
    return record?.recordType === type ? structuredClone(record) : null
  },
  modifyRecords: async (_: unknown, operations: any[]) =>
    operations.map(({ operationType, record }) => {
      const old = state.records.get(record.recordName)
      if (
        (operationType === 'create' && old) ||
        (operationType !== 'create' &&
          old?.recordChangeTag !== record.recordChangeTag)
      )
        throw new Error('conflict')
      const saved = {
        ...old,
        ...record,
        fields: { ...old?.fields, ...record.fields },
        recordChangeTag: String(Number(old?.recordChangeTag ?? 0) + 1)
      }
      state.records.set(record.recordName, saved)
      return saved
    })
}))
import { digest } from '@/lib/hikki/device-registration'
import { pairReviewer, dispatchNotification } from '@/lib/hikki/notifications'
const db = {} as CloudKitConfig,
  secret = 'a'.repeat(43),
  token = 'b'.repeat(64)
const registration =
  'device-registration-ios-00000000-0000-0000-0000-000000000000'
const deviceID = `device-${digest(`app.yancey.hikki:production:${token}`)}`
function add(type: string, id: string, fields: Record<string, unknown>) {
  state.records.set(id, {
    recordName: id,
    recordType: type,
    recordChangeTag: '1',
    created: { userRecordName: 'alice' },
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, { value }])
    )
  })
}
beforeEach(() => {
  state.records.clear()
  add('DeviceRegistration', registration, {
    token,
    topic: 'app.yancey.hikki',
    environment: 'production',
    pairingHash: digest(secret),
    pairingExpiresAt: Date.now() + 600_000
  })
  add('CommunityDevice', deviceID, {
    registration,
    account: 'cloud:alice',
    enabled: 1
  })
})
describe('CMS reviewer pairing', () => {
  it('links the trusted iCloud account using a fresh code and consumes it once', async () => {
    await expect(
      pairReviewer(db, `${registration}.${'x'.repeat(43)}`, 'Mac', {
        id: 'admin',
        email: 'admin@example.com'
      })
    ).rejects.toThrow('invalid, expired')
    await pairReviewer(db, `${registration}.${secret}`, 'Mac', {
      id: 'admin',
      email: 'admin@example.com'
    })
    const binding = [...state.records.values()].find(
      (record) => record.recordType === 'CommunityReviewerDevice'
    )
    expect(binding.fields.email.value).toBe('admin@example.com')
    expect(binding.fields.account.value).toBe('cloud:alice')
    await expect(
      pairReviewer(db, `${registration}.${secret}`, 'Another', {
        id: 'admin',
        email: 'admin@example.com'
      })
    ).rejects.toThrow('invalid, expired')
  })
  it('refuses legacy device connections even with a valid proof', async () => {
    const legacy = registration.replace('-ios-', '-')
    state.records.set(legacy, {
      ...state.records.get(registration),
      recordName: legacy
    })
    await expect(
      pairReviewer(db, `${legacy}.${secret}`, 'Legacy', {
        id: 'admin',
        email: 'admin@example.com'
      })
    ).rejects.toThrow('invalid, expired')
    expect(
      [...state.records.values()].some(
        (record) => record.recordType === 'CommunityReviewerDevice'
      )
    ).toBe(false)
  })
  it('rejects expired codes and disabled or transferred devices', async () => {
    state.records.get(registration).fields.pairingExpiresAt.value =
      Date.now() - 1
    await expect(
      pairReviewer(db, `${registration}.${secret}`, 'Mac', {
        id: 'admin',
        email: 'admin@example.com'
      })
    ).rejects.toThrow('invalid, expired')
    state.records.get(registration).fields.pairingExpiresAt.value =
      Date.now() + 600_000
    state.records.get(deviceID).fields.account.value = 'cloud:bob'
    await expect(
      pairReviewer(db, `${registration}.${secret}`, 'Mac', {
        id: 'admin',
        email: 'admin@example.com'
      })
    ).rejects.toThrow('Enable community')
  })
  it('dispatches only to the fixed website origin and never places a capability in the URL', async () => {
    const id = 'notification-' + 'a'.repeat(64)
    add('CommunityNotification', id, { status: 'pending' })
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ delivered: true }))
    expect(await dispatchNotification(db, id, fetcher)).toBe(true)
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://hikki.yancey.app/api/notifications/deliver'
    )
    expect(fetcher.mock.calls[0][1].redirect).toBe('error')
    const body = JSON.parse(fetcher.mock.calls[0][1].body)
    expect(state.records.get(id).fields.dispatchHash.value).toBe(
      digest(body.secret)
    )
    expect(body.id).toBe(id)
  })
})
