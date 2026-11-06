import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CloudKitConfig } from '@/lib/hikki/cloudkit'

const state = vi.hoisted(() => ({ records: new Map<string, any>() }))
vi.mock('@/lib/hikki/cloudkit', () => ({
  CloudKitRequestError: class extends Error {
    constructor(readonly status: number) {
      super(String(status))
    }
  },
  lookupRecord: async (_: unknown, type: string, id: string) => {
    const record = state.records.get(id)
    return record?.recordType === type ? structuredClone(record) : null
  },
  queryRecords: async (_: unknown, type: string, options: any = {}) => ({
    records: [...state.records.values()].filter(
      (record) =>
        record.recordType === type &&
        (options.filterBy ?? []).every(
          (filter: any) =>
            record.fields[filter.fieldName]?.value === filter.fieldValue.value
        )
    ),
    marker: null
  }),
  modifyRecords: vi.fn(),
  rereferenceAssets: vi.fn()
}))
import { digest } from '@/lib/hikki/device-registration'
import { listReviewerDevices } from '@/lib/hikki/notifications'
import { readerMessage } from '@/lib/hikki/preview-channel'
import {
  getListing,
  listPublishedListings,
  reviewPreview
} from '@/lib/hikki/review-service'

const db = {} as CloudKitConfig
const uuid = '15b50bb1-f098-4ad7-ab2c-44052590f319',
  page = `page-review-${uuid}`
const url = 'https://assets.icloud-content.com/private-payload?token=fixture'
function add(type: string, id: string, values: Record<string, unknown>) {
  state.records.set(id, {
    recordType: type,
    recordName: id,
    recordChangeTag: '1',
    created: { userRecordName: 'alice', timestamp: 100 },
    fields: Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, { value }])
    )
  })
}
beforeEach(() => {
  state.records.clear()
  add('ReviewSubmission', 'review-a', {
    payloadFile: { downloadURL: url },
    files: [{ downloadURL: url + '-image' }],
    tags: ['study']
  })
  add('PublishedPage', page, {
    payloadFile: { downloadURL: url },
    files: [],
    title: 'Approved',
    publishedAt: 200
  })
  add('Listing', `listing-${page}`, {
    page: { recordName: page },
    title: 'Approved',
    publishedAt: 200
  })
})
describe('protected management projections', () => {
  it('returns only version-checked review assets and never content through a public endpoint', async () => {
    expect(await reviewPreview(db, 'review-a', false, '1')).toEqual({
      id: 'review-a',
      revision: '1',
      payloadURL: url,
      fileURLs: [url + '-image'],
      tags: ['study']
    })
    await expect(reviewPreview(db, 'review-a', false, 'stale')).rejects.toThrow(
      '409'
    )
    await expect(reviewPreview(db, page, false, '1')).rejects.toThrow('404')
  })
  it('requires both listing and page revisions for published previews', async () => {
    const listing = await getListing(db, `listing-${page}`)
    expect(listing?.publicURL).toBe(
      `https://hikki.yancey.app/community/${uuid}`
    )
    expect((await listPublishedListings(db)).items[0].publicURL).toBe(
      listing?.publicURL
    )
    expect(
      (await reviewPreview(db, `listing-${page}`, true, listing!.revision))
        .payloadURL
    ).toBe(url)
    state.records.get(page).recordChangeTag = '2'
    await expect(
      reviewPreview(db, `listing-${page}`, true, listing!.revision)
    ).rejects.toThrow('409')
  })
  it.each([
    'http://assets.icloud-content.com/a',
    'https://assets.icloud-content.com.evil.test/a',
    'https://example.com/a',
    'javascript:alert(1)'
  ])('rejects an unsafe asset address: %s', async (unsafe) => {
    state.records.get('review-a').fields.payloadFile.value.downloadURL = unsafe
    await expect(reviewPreview(db, 'review-a', false, '1')).rejects.toThrow(
      '502'
    )
  })
  it('shows account metadata and iOS counts without returning tokens or proof material', async () => {
    add('CommunityReviewerDevice', `reviewer-${digest('cloud:alice')}`, {
      account: 'cloud:alice',
      name: 'Yancey',
      email: 'admin@example.com',
      enabled: 1,
      pairingHash: 'do-not-return'
    })
    const ios = 'device-registration-ios-00000000-0000-0000-0000-000000000001'
    add('CommunityDevice', 'ios', {
      account: 'cloud:alice',
      registration: ios,
      enabled: 1,
      updatedAt: 400,
      token: 'private-token'
    })
    add('CommunityDevice', 'disabled', {
      account: 'cloud:alice',
      registration: ios,
      enabled: 0,
      updatedAt: 500
    })
    add('CommunityDevice', 'mac', {
      account: 'cloud:alice',
      registration: 'device-registration-legacy',
      enabled: 1,
      updatedAt: 900
    })
    add('CommunityDevice', 'other', {
      account: 'cloud:bob',
      registration: ios,
      enabled: 1
    })
    const result = await listReviewerDevices(db)
    expect(result.items[0]).toMatchObject({
      account: 'alice',
      linkedAt: 100,
      enabledDevices: 1,
      deviceUpdatedAt: 500
    })
    expect(JSON.stringify(result)).not.toMatch(
      /private-token|pairingHash|do-not-return/
    )
  })
})
describe('preview frame boundary', () => {
  it('requires the reader origin, exact frame and current request nonce', () => {
    const source = {} as Window
    const event = {
      source,
      origin: 'https://hikki.yancey.app',
      data: { type: 'hikki.preview.rendered', nonce: 'current' }
    }
    expect(readerMessage(event, source, 'current')).toBe('rendered')
    expect(
      readerMessage(
        { ...event, origin: 'https://evil.test' },
        source,
        'current'
      )
    ).toBeNull()
    expect(
      readerMessage({ ...event, source: {} as Window }, source, 'current')
    ).toBeNull()
    expect(readerMessage(event, source, 'previous')).toBeNull()
    expect(
      readerMessage({ ...event, source: null }, null, 'current')
    ).toBeNull()
  })
})
