import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CloudKitConfig } from '@/lib/hikki/cloudkit'

const state = vi.hoisted(() => ({
  records: new Map<string, any>(),
  operations: [] as any[],
  failDelete: false
}))
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
  queryRecords: async (_db: unknown, type: string, options: any) => ({
    records: [...state.records.values()].filter(
      (record) =>
        record.recordType === type &&
        record.fields.status.value === options.filterBy[0].fieldValue.value
    ),
    marker: 'next'
  }),
  modifyRecords: async (_db: unknown, operations: any[]) =>
    operations.map(({ operationType, record }) => {
      state.operations.push({ operationType, record })
      const old = state.records.get(record.recordName)
      if (operationType === 'create') {
        state.records.set(record.recordName, structuredClone(record))
        return record
      }
      if (!old || record.recordChangeTag !== old.recordChangeTag)
        throw new Error('409')
      if (operationType === 'delete') {
        if (state.failDelete) throw new Error('offline')
        state.records.delete(record.recordName)
        return { ...record, deleted: true }
      }
      const updated = {
        ...old,
        recordChangeTag: old.recordChangeTag + '+',
        fields: { ...old.fields, ...record.fields }
      }
      state.records.set(record.recordName, updated)
      return structuredClone(updated)
    })
}))
vi.mock('@/lib/hikki/review-service', () => ({
  getListing: vi.fn().mockResolvedValue({
    revision: '["listing-1","page-1"]',
    publicURL: 'https://hikki.yancey.app/community/example'
  }),
  unpublishReview: vi.fn().mockResolvedValue(undefined)
}))
import {
  listPageReports,
  pageReportDetail,
  resolvePageReport
} from '@/lib/hikki/page-reports'
import { unpublishReview } from '@/lib/hikki/review-service'

const db = {} as CloudKitConfig
const id = 'page-report-22222222-2222-2222-2222-222222222222'
const page = '11111111-1111-1111-1111-111111111111'
const input = {
  id,
  revision: 'report-1',
  action: 'remove' as const,
  targetRevision: 'page-1'
}
beforeEach(() => {
  state.records.clear()
  state.operations.length = 0
  state.failDelete = false
  vi.clearAllMocks()
  state.records.set(id, {
    recordName: id,
    recordType: 'SharedPageReport',
    recordChangeTag: 'report-1',
    fields: {
      page: { value: page },
      pageRevision: { value: 'page-1' },
      scope: { value: 'link' },
      reason: { value: 'privacy' },
      details: { value: '<script>reader allegation</script>' },
      status: { value: 'open' },
      createdAt: { value: 123 }
    }
  })
  state.records.set(page, {
    recordName: page,
    recordType: 'PublishedPage',
    recordChangeTag: 'page-1',
    created: { userRecordName: 'owner' },
    fields: {
      listed: { value: 0 },
      payloadFile: {
        value: { downloadURL: 'https://secret.icloud-content.com/private' }
      }
    }
  })
})
describe('reactive CMS report handling', () => {
  it('lists reports by status with pagination and exposes no private page assets', async () => {
    const result = await listPageReports(db, 'open')
    expect(result.items).toHaveLength(1)
    expect(result.marker).toBe('next')
    const detail = await pageReportDetail(db, id)
    expect(detail.details).toBe('<script>reader allegation</script>')
    expect(detail.target).toMatchObject({
      exists: true,
      revision: 'page-1',
      changed: false
    })
    expect(JSON.stringify(detail)).not.toContain('downloadURL')
    expect(await listPageReports(db, 'dismissed')).toMatchObject({ items: [] })
  })
  it('dismisses without deleting the hosted page, and records actor and time', async () => {
    expect(
      await resolvePageReport(db, { ...input, action: 'dismiss' }, 'admin')
    ).toMatchObject({ status: 'dismissed' })
    expect(state.records.has(page)).toBe(true)
    expect(state.records.get(id).fields.resolvedBy.value).toBe('cms:admin')
    expect(state.records.get(id).fields.resolvedAt.value).toBeGreaterThan(0)
  })
  it('claims the report then removes exactly the confirmed encrypted revision and resolves it', async () => {
    expect(await resolvePageReport(db, input, 'admin')).toMatchObject({
      status: 'removed'
    })
    expect(state.records.has(page)).toBe(false)
    expect(state.operations[0].record.fields.status.value).toBe('removing')
    expect(state.records.get(id).fields.status.value).toBe('removed')
  })
  it('refuses stale report and target revisions before any removal', async () => {
    await expect(
      resolvePageReport(db, { ...input, revision: 'stale' }, 'admin')
    ).rejects.toThrow('409')
    await expect(
      resolvePageReport(db, { ...input, targetRevision: 'stale' }, 'admin')
    ).rejects.toThrow('409')
    expect(state.operations).toHaveLength(0)
    expect(state.records.has(page)).toBe(true)
  })
  it('shows a later page revision and requires confirmation of that current version', async () => {
    state.records.get(page).recordChangeTag = 'page-2'
    expect((await pageReportDetail(db, id)).target.changed).toBe(true)
    await expect(resolvePageReport(db, input, 'admin')).rejects.toThrow('409')
    await resolvePageReport(db, { ...input, targetRevision: 'page-2' }, 'admin')
    expect(state.records.has(page)).toBe(false)
  })
  it('retains a recoverable removing state on failure and prevents a concurrent dismissal', async () => {
    state.failDelete = true
    await expect(resolvePageReport(db, input, 'admin')).rejects.toThrow(
      'offline'
    )
    expect(state.records.get(id).fields.status.value).toBe('removing')
    const retry = { ...input, revision: 'report-1+' }
    await expect(
      resolvePageReport(db, { ...retry, action: 'dismiss' }, 'another')
    ).rejects.toThrow('409')
    state.failDelete = false
    await resolvePageReport(db, retry, 'admin')
    expect(state.records.get(id).fields.status.value).toBe('removed')
  })
  it('never removes a newer page during removal recovery; the stale concern may be dismissed', async () => {
    state.failDelete = true
    await expect(resolvePageReport(db, input, 'admin')).rejects.toThrow()
    state.records.get(page).recordChangeTag = 'page-2'
    await expect(
      resolvePageReport(
        db,
        { ...input, revision: 'report-1+', targetRevision: 'page-2' },
        'admin'
      )
    ).rejects.toThrow('409')
    await resolvePageReport(
      db,
      { ...input, revision: 'report-1+', action: 'dismiss' },
      'admin'
    )
    expect(state.records.has(page)).toBe(true)
  })
  it('closes an already absent target honestly without claiming to have removed it', async () => {
    state.records.delete(page)
    await expect(resolvePageReport(db, input, 'admin')).rejects.toThrow('409')
    expect(
      await resolvePageReport(db, { ...input, action: 'unavailable' }, 'admin')
    ).toMatchObject({ status: 'unavailable' })
  })
  it('routes Community removal through its listing and combined revision guard', async () => {
    state.records.get(id).fields.scope.value = 'community'
    state.records.get(page).fields.listed.value = 1
    state.records.set(`listing-${page}`, {
      recordType: 'Listing',
      fields: { page: { value: { recordName: page } } }
    })
    await resolvePageReport(
      db,
      { ...input, targetRevision: '["listing-1","page-1"]' },
      'admin'
    )
    expect(unpublishReview).toHaveBeenCalledWith(
      db,
      `listing-${page}`,
      '["listing-1","page-1"]'
    )
  })
  it('allows reading/dismissing a concern after a sharing mode changes, without deleting that other mode', async () => {
    state.records.get(page).fields.listed.value = 1
    const detail = await pageReportDetail(db, id)
    expect(detail.target).toMatchObject({ modeChanged: true, revision: '' })
    await expect(resolvePageReport(db, input, 'admin')).rejects.toThrow('409')
    await resolvePageReport(db, { ...input, action: 'dismiss' }, 'admin')
    expect(state.records.has(page)).toBe(true)
  })
})
