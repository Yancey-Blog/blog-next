import { beforeEach, describe, expect, it, vi } from 'vitest'

import { copyAttachmentAssets } from '@/lib/hikki/attachment-assets'
vi.mock('@/lib/hikki/attachment-assets', () => ({
  copyAttachmentAssets: vi.fn()
}))

import { rereferenceAssets, type CloudKitConfig } from '@/lib/hikki/cloudkit'
const state = vi.hoisted(() => ({
  records: new Map<string, any>(),
  failListing: false,
  concurrentPage: false,
  changeSourceDuringCopy: false,
  concurrentUnpublish: false,
  failPublicOnce: false
}))
vi.mock('@/lib/hikki/cloudkit', () => {
  class RequestError extends Error {
    constructor(readonly status: number) {
      super(String(status))
    }
  }
  return {
    CloudKitRequestError: RequestError,
    lookupRecord: async (_db: unknown, type: string, id: string) => {
      const record = state.records.get(id)
      return record?.recordType === type ? structuredClone(record) : null
    },
    modifyRecords: async (_db: unknown, operations: any[]) =>
      operations.map(({ operationType, record }) => {
        const old = state.records.get(record.recordName)
        if (state.failPublicOnce && record.recordType === 'PublishedPage') {
          state.failPublicOnce = false
          throw new RequestError(400)
        }
        if (
          state.concurrentUnpublish &&
          operationType === 'delete' &&
          old?.recordType === 'PublishedPage'
        ) {
          state.concurrentUnpublish = false
          old.recordChangeTag = '99'
          old.fields.title.value = 'Newly approved'
          throw new RequestError(409)
        }
        if (state.failListing && old?.recordType === 'Listing') {
          state.failListing = false
          throw new RequestError(409)
        }
        if (state.concurrentPage && old?.recordType === 'PublishedPage') {
          state.concurrentPage = false
          old.fields.reviewRecordName.value = 'review-other'
          old.recordChangeTag = '99'
          throw new RequestError(409)
        }
        if (
          operationType === 'create'
            ? !!old
            : old?.recordChangeTag !== record.recordChangeTag
        )
          throw new RequestError(409)
        if (operationType === 'delete') {
          state.records.delete(record.recordName)
          return structuredClone(old)
        }
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
    rereferenceAssets: vi.fn(async () => {
      if (state.changeSourceDuringCopy) {
        state.changeSourceDuringCopy = false
        state.records.get('review-update').recordChangeTag = '99'
      }
      return [
        {
          fileChecksum: 'fixture-checksum',
          receipt: 'fixture-receipt',
          size: 128,
          downloadURL: 'https://assets.icloud-content.com/approved-snapshot'
        }
      ]
    })
  }
})
import {
  approveReview,
  rejectReview,
  getListing,
  getReview,
  reviewAssetURL,
  unpublishReview
} from '@/lib/hikki/review-service'
const db = {} as CloudKitConfig
function add(
  type: string,
  id: string,
  fields: Record<string, unknown>,
  owner = 'alice'
) {
  state.records.set(id, {
    recordType: type,
    recordName: id,
    recordChangeTag: '1',
    created: { userRecordName: owner },
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, { value }])
    )
  })
}
beforeEach(() => {
  state.records.clear()
  state.failListing = false
  state.concurrentPage = false
  state.changeSourceDuringCopy = false
  state.concurrentUnpublish = false
  state.failPublicOnce = false
  add('ReviewSubmission', 'review-original', {
    status: 'approved',
    publicPageRecordName: 'page-review-original'
  })
  add('PublishedPage', 'page-review-original', {
    reviewRecordName: 'review-original',
    title: 'Original',
    publishedAt: 100
  })
  add('Listing', 'listing-page-review-original', {
    page: { recordName: 'page-review-original' },
    title: 'Original'
  })
  add('ReviewSubmission', 'review-update', {
    replaces: 'review-original',
    status: 'pending',
    title: 'Updated',
    tags: ['study']
  })
})
describe('reviewed document updates', () => {
  it('resumes a failed first publication with writable receipts and absent optional lists', async () => {
    add('ReviewSubmission', 'review-new', {
      status: 'pending',
      title: 'First page'
    })
    state.failPublicOnce = true
    await expect(approveReview(db, 'review-new', '1')).rejects.toThrow('400')
    const claimed = await getReview(db, 'review-new')
    expect(claimed?.status).toBe('publishing')
    expect(state.records.has('page-review-new')).toBe(false)
    await approveReview(db, 'review-new', claimed!.revision)
    const page = state.records.get('page-review-new')
    expect(page.fields.payloadFile).toEqual({
      value: {
        fileChecksum: 'fixture-checksum',
        receipt: 'fixture-receipt',
        size: 128
      }
    })
    expect(page.fields).not.toHaveProperty('files')
    expect(page.fields).not.toHaveProperty('tags')
    expect(page.fields).not.toHaveProperty('terms')
    expect(page.fields.icon.value).toBe('')
    expect(page.fields.author.value).toBe('')
    expect(
      Object.values(page.fields).some((field: any) => field.value === null)
    ).toBe(false)
    expect((await getReview(db, 'review-new'))?.status).toBe('approved')
    expect(state.records.has('listing-page-review-new')).toBe(true)
  })
  it('publishes a seven-attachment first submission without re-referencing the list field', async () => {
    const files = Array.from({ length: 7 }, (_, i) => ({
      fileChecksum: `checksum-${i}`,
      receipt: `receipt-${i}`,
      size: 3
    }))
    vi.mocked(copyAttachmentAssets).mockResolvedValueOnce(files)
    add('ReviewSubmission', 'review-seven', {
      status: 'pending',
      title: 'Seven attachments',
      files
    })
    await approveReview(db, 'review-seven', '1')
    expect(rereferenceAssets).toHaveBeenLastCalledWith(db, 'review-seven', [
      'payloadFile'
    ])
    expect(copyAttachmentAssets).toHaveBeenCalledWith(
      db,
      'page-review-seven',
      files
    )
    expect(state.records.get('page-review-seven').fields.files.value).toEqual(
      files
    )
    expect((await getReview(db, 'review-seven'))?.status).toBe('approved')
  })
  it('clears removed attachments and optional metadata on an approved update', async () => {
    const page = state.records.get('page-review-original')
    page.fields.files = {
      value: [{ fileChecksum: 'old', receipt: 'old', size: 10 }]
    }
    page.fields.icon = { value: 'old-icon' }
    page.fields.author = { value: 'old-author' }
    page.fields.terms = { value: ['old-term'] }
    await approveReview(db, 'review-update', '1')
    const updated = state.records.get('page-review-original')
    expect(updated.fields.files.value).toEqual([])
    expect(updated.fields.icon.value).toBe('')
    expect(updated.fields.author.value).toBe('')
    expect(updated.fields.terms.value).toEqual([])
    const listing = state.records.get('listing-page-review-original')
    expect(listing.fields.icon.value).toBe('')
    expect(listing.fields.author.value).toBe('')
    expect(listing.fields.terms.value).toEqual([])
  })
  it('never publishes a download URL without a writable asset receipt', async () => {
    vi.mocked(rereferenceAssets).mockResolvedValueOnce([
      { downloadURL: 'https://assets.icloud-content.com/read-only' }
    ])
    await expect(approveReview(db, 'review-update', '1')).rejects.toThrow('502')
    expect(state.records.get('page-review-original').fields.title.value).toBe(
      'Original'
    )
    expect((await getReview(db, 'review-update'))?.status).toBe('publishing')
  })
  it('rejects approval and rejection after the content shown to the reviewer changes', async () => {
    const seen = await getReview(db, 'review-update')
    state.records.get('review-update').recordChangeTag = '3'
    await expect(
      approveReview(db, 'review-update', seen!.revision)
    ).rejects.toThrow('409')
    await expect(
      rejectReview(
        db,
        'review-update',
        'Remove private details.',
        seen!.revision
      )
    ).rejects.toThrow('409')
    expect(state.records.get('review-update').fields.status.value).toBe(
      'pending'
    )
    expect(state.records.get('page-review-original').fields.title.value).toBe(
      'Original'
    )
  })
  it('only exposes attachments from the version currently being reviewed', async () => {
    state.records.get('review-update').fields.files = {
      value: [{ downloadURL: 'https://assets.icloud-content.com/file' }]
    }
    expect(await reviewAssetURL(db, 'review-update', 0, '1')).toContain('/file')
    state.records.get('review-update').recordChangeTag = '3'
    await expect(reviewAssetURL(db, 'review-update', 0, '1')).rejects.toThrow(
      '409'
    )
  })
  it('does not publish when the source changes while its assets are copied', async () => {
    state.changeSourceDuringCopy = true
    await expect(approveReview(db, 'review-update', '1')).rejects.toThrow('409')
    expect(state.records.get('page-review-original').fields.title.value).toBe(
      'Original'
    )
    expect(
      state.records.get('listing-page-review-original').fields.title.value
    ).toBe('Original')
  })
  it('does not finish a partially published revision using a changed source', async () => {
    state.failListing = true
    await expect(approveReview(db, 'review-update', '1')).rejects.toThrow('409')
    state.records.get('review-update').recordChangeTag = '3'
    state.records.get('review-update').fields.title.value =
      'Unreviewed replacement'
    await expect(approveReview(db, 'review-update', '3')).rejects.toThrow('409')
    expect(state.records.get('page-review-original').fields.title.value).toBe(
      'Updated'
    )
    expect(
      state.records.get('listing-page-review-original').fields.title.value
    ).toBe('Original')
    const published = await getListing(db, 'listing-page-review-original')
    expect(published?.title).toBe('Updated')
    await unpublishReview(
      db,
      'listing-page-review-original',
      published!.revision
    )
    expect(state.records.has('page-review-original')).toBe(false)
    expect(state.records.get('review-update').fields.status.value).toBe(
      'withdrawn'
    )
  })
  it('waits for an active publication to finish before allowing unpublishing', async () => {
    state.failListing = true
    await expect(approveReview(db, 'review-update', '1')).rejects.toThrow('409')
    const published = await getListing(db, 'listing-page-review-original')
    await expect(
      unpublishReview(db, 'listing-page-review-original', published!.revision)
    ).rejects.toThrow('409')
    expect(state.records.has('page-review-original')).toBe(true)
  })
  it('requires the reviewed public page revision before unpublishing', async () => {
    const seen = await getListing(db, 'listing-page-review-original')
    state.records.get('page-review-original').recordChangeTag = '3'
    await expect(
      unpublishReview(db, 'listing-page-review-original', seen!.revision)
    ).rejects.toThrow('409')
    expect(state.records.has('page-review-original')).toBe(true)
    expect(state.records.has('listing-page-review-original')).toBe(true)
  })
  it('preserves a concurrent approved page and its listing instead of forcing deletion', async () => {
    const seen = await getListing(db, 'listing-page-review-original')
    state.concurrentUnpublish = true
    await expect(
      unpublishReview(db, 'listing-page-review-original', seen!.revision)
    ).rejects.toThrow('409')
    expect(state.records.get('page-review-original').fields.title.value).toBe(
      'Newly approved'
    )
    expect(state.records.has('listing-page-review-original')).toBe(true)
  })
  it('can retry interrupted unpublishing without losing the author withdrawal state', async () => {
    const seen = await getListing(db, 'listing-page-review-original')
    state.failListing = true
    await expect(
      unpublishReview(db, 'listing-page-review-original', seen!.revision)
    ).rejects.toThrow('409')
    expect(state.records.has('page-review-original')).toBe(false)
    expect(state.records.get('review-original').fields.status.value).toBe(
      'withdrawn'
    )
    const remaining = await getListing(db, 'listing-page-review-original')
    await unpublishReview(
      db,
      'listing-page-review-original',
      remaining!.revision
    )
    expect(state.records.has('listing-page-review-original')).toBe(false)
  })
  it('keeps the old public snapshot and link when an update is rejected', async () => {
    expect(state.records.get('page-review-original').fields.title.value).toBe(
      'Original'
    )
    await rejectReview(
      db,
      'review-update',
      'Please remove private details.',
      '1'
    )
    expect(state.records.get('page-review-original').fields.title.value).toBe(
      'Original'
    )
    expect(
      state.records.get('listing-page-review-original').fields.page.value
        .recordName
    ).toBe('page-review-original')
  })
  it('replaces only after approval and retains the same public URL and discovery entry', async () => {
    await approveReview(
      db,
      'review-update',
      state.records.get('review-update').recordChangeTag
    )
    expect(state.records.get('page-review-original').fields.title.value).toBe(
      'Updated'
    )
    expect(
      state.records.get('page-review-original').fields.reviewRecordName.value
    ).toBe('review-update')
    expect(
      state.records.get('listing-page-review-original').fields.page.value
        .recordName
    ).toBe('page-review-original')
    expect(
      state.records.get('review-update').fields.publicPageRecordName.value
    ).toBe('page-review-original')
    expect(state.records.get('review-update').fields.status.value).toBe(
      'approved'
    )
    expect(state.records.has('page-review-update')).toBe(false)
  })
  it('rejects updates across author identities or against a superseded approved snapshot', async () => {
    state.records.get('review-update').created.userRecordName = 'bob'
    await expect(
      approveReview(
        db,
        'review-update',
        state.records.get('review-update').recordChangeTag
      )
    ).rejects.toThrow('409')
    expect(state.records.get('page-review-original').fields.title.value).toBe(
      'Original'
    )
    state.records.get('review-update').created.userRecordName = 'alice'
    state.records.get('page-review-original').fields.reviewRecordName.value =
      'review-other'
    await expect(
      approveReview(
        db,
        'review-update',
        state.records.get('review-update').recordChangeTag
      )
    ).rejects.toThrow('409')
  })
  it('can finish a publication after an interrupted listing update without deleting the live page', async () => {
    state.failListing = true
    await expect(
      approveReview(
        db,
        'review-update',
        state.records.get('review-update').recordChangeTag
      )
    ).rejects.toThrow('409')
    expect(state.records.get('review-update').fields.status.value).toBe(
      'publishing'
    )
    expect(state.records.get('page-review-original').fields.title.value).toBe(
      'Updated'
    )
    await approveReview(
      db,
      'review-update',
      state.records.get('review-update').recordChangeTag
    )
    expect(state.records.get('review-update').fields.status.value).toBe(
      'approved'
    )
    expect(
      state.records.get('listing-page-review-original').fields.title.value
    ).toBe('Updated')
  })
  it('does not overwrite a winning concurrent revision and leaves the losing review actionable', async () => {
    state.concurrentPage = true
    await expect(
      approveReview(
        db,
        'review-update',
        state.records.get('review-update').recordChangeTag
      )
    ).rejects.toThrow('409')
    expect(
      state.records.get('page-review-original').fields.reviewRecordName.value
    ).toBe('review-other')
    expect(state.records.get('review-update').fields.status.value).toBe(
      'pending'
    )
  })
})
