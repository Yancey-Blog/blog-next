import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CloudKitConfig } from '@/lib/hikki/cloudkit'
const state = vi.hoisted(() => ({ records: new Map<string, any>() }))
vi.mock('@/lib/hikki/cloudkit', () => ({
  CloudKitRequestError: class extends Error {
    constructor(readonly status: number) {
      super(String(status))
    }
  },
  lookupRecord: async (_db: unknown, type: string, id: string) => {
    const record = state.records.get(id)
    return record?.recordType === type ? structuredClone(record) : null
  },
  modifyRecords: async (_db: unknown, operations: any[]) =>
    operations.map(({ operationType, record }) => {
      const old = state.records.get(record.recordName)
      if (
        operationType === 'create'
          ? !!old
          : old?.recordChangeTag !== record.recordChangeTag
      )
        throw new Error('conflict')
      const saved = {
        ...old,
        ...record,
        fields: { ...old?.fields, ...record.fields },
        recordChangeTag: String(Number(old?.recordChangeTag ?? 0) + 1)
      }
      state.records.set(record.recordName, saved)
      return structuredClone(saved)
    }),
  queryRecords: vi.fn(),
  rereferenceAssets: vi.fn()
}))
import { queueAuthorDecision } from '@/lib/hikki/notifications'
import { getReview, rejectReview } from '@/lib/hikki/review-service'
const db = {} as CloudKitConfig
beforeEach(() => {
  state.records.clear()
  state.records.set('review-a', {
    recordName: 'review-a',
    recordType: 'ReviewSubmission',
    recordChangeTag: '1',
    created: { userRecordName: 'alice' },
    fields: {
      status: { value: 'pending' },
      title: { value: 'Travel notes' },
      account: { value: 'cloud:mallory' }
    }
  })
})
describe('manual review decisions', () => {
  it('requires a reason before rejecting and exposes it through the protected review projection', async () => {
    await expect(rejectReview(db, 'review-a', '   ', '1')).rejects.toThrow(
      '400'
    )
    expect((await getReview(db, 'review-a'))?.status).toBe('pending')
    await rejectReview(
      db,
      'review-a',
      '  Please remove personal addresses.  ',
      '1'
    )
    expect(await getReview(db, 'review-a')).toMatchObject({
      status: 'rejected',
      decisionReason: 'Please remove personal addresses.'
    })
    await expect(
      rejectReview(db, 'review-a', 'Another reason', '2')
    ).rejects.toThrow('409')
  })
  it('queues a rejection once for the trusted author with a durable reason', async () => {
    await rejectReview(db, 'review-a', 'Please remove personal addresses.', '1')
    const first = await queueAuthorDecision(db, 'review-a')
    expect(await queueAuthorDecision(db, 'review-a')).toBe(first)
    const notification = state.records.get(first!)
    expect(notification.fields.account.value).toBe('cloud:alice')
    expect(notification.fields.kind.value).toBe('rejected')
    expect(notification.fields.reason.value).toBe(
      'Please remove personal addresses.'
    )
    expect(notification.fields.title.value).toBe('Travel notes')
    expect(
      [...state.records.values()].filter(
        (record) => record.recordType === 'CommunityNotification'
      )
    ).toHaveLength(1)
  })
  it('does not queue a publication result before a decision', async () => {
    expect(await queueAuthorDecision(db, 'review-a')).toBeNull()
  })
})
