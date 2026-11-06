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
  queryRecords: async () => ({
    records: [...state.records.values()],
    marker: 'next-page'
  }),
  modifyRecords: async (_db: unknown, operations: any[]) =>
    operations.map(({ operationType, record }) => {
      const old = state.records.get(record.recordName)
      if (
        operationType !== 'delete' ||
        old?.recordChangeTag !== record.recordChangeTag
      )
        throw new Error('conflict')
      state.records.delete(record.recordName)
      return { ...record, deleted: true }
    })
}))
import { listLinkShares, removeLinkShare } from '@/lib/hikki/link-shares'

const db = {} as CloudKitConfig
beforeEach(() => {
  state.records.clear()
  for (const [id, listed] of [
    ['private-link', 0],
    ['community-page', 1]
  ] as const) {
    state.records.set(id, {
      recordType: 'PublishedPage',
      recordName: id,
      recordChangeTag: '2',
      created: { timestamp: 100, userRecordName: 'trusted-owner' },
      modified: { timestamp: 200 },
      fields: {
        listed: { value: listed },
        bytes: { value: 1024 },
        title: { value: 'not public metadata' },
        payloadFile: {
          value: {
            downloadURL:
              'https://secret-assets.icloud-content.com/payload?token=secret'
          }
        }
      }
    })
  }
})
describe('link-only sharing management', () => {
  it('lists only encrypted-share metadata and preserves pagination without exposing content or assets', async () => {
    expect(await listLinkShares(db)).toEqual({
      items: [
        {
          id: 'private-link',
          revision: '2',
          owner: 'trusted-owner',
          createdAt: 100,
          updatedAt: 200,
          bytes: 1024
        }
      ],
      marker: 'next-page'
    })
  })
  it('refuses to remove a Community page through the link-only management action', async () => {
    await expect(removeLinkShare(db, 'community-page', '2')).rejects.toThrow(
      '409'
    )
    expect(state.records.has('community-page')).toBe(true)
  })
  it('does not remove a newer revision than the one confirmed by the administrator', async () => {
    await expect(removeLinkShare(db, 'private-link', '1')).rejects.toThrow(
      '409'
    )
    expect(state.records.has('private-link')).toBe(true)
  })
  it('removes only the confirmed hosted record and leaves other sharing intact', async () => {
    await expect(removeLinkShare(db, 'private-link', '2')).resolves.toEqual({
      ok: true
    })
    expect(state.records.has('private-link')).toBe(false)
    expect(state.records.has('community-page')).toBe(true)
  })
})
