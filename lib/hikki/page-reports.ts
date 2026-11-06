import { randomUUID } from 'node:crypto'

import {
  CloudKitRequestError,
  lookupRecord,
  modifyRecords,
  queryRecords,
  type CloudKitConfig,
  type CloudKitRecord
} from './cloudkit'
import { removeLinkShare } from './link-shares'
import { getListing, unpublishReview } from './review-service'

const value = (record: CloudKitRecord, name: string) =>
  record.fields?.[name]?.value
const text = (record: CloudKitRecord, name: string) =>
  typeof value(record, name) === 'string' ? String(value(record, name)) : ''
function item(record: CloudKitRecord) {
  return {
    id: record.recordName,
    revision: record.recordChangeTag ?? '',
    page: text(record, 'page'),
    scope: text(record, 'scope'),
    pageRevision: text(record, 'pageRevision'),
    reason: text(record, 'reason'),
    details: text(record, 'details'),
    status: text(record, 'status'),
    removalRevision: text(record, 'removalRevision'),
    createdAt:
      typeof value(record, 'createdAt') === 'number'
        ? Number(value(record, 'createdAt'))
        : null,
    resolvedAt:
      typeof value(record, 'resolvedAt') === 'number'
        ? Number(value(record, 'resolvedAt'))
        : null,
    resolvedBy: text(record, 'resolvedBy')
  }
}
export async function listPageReports(
  db: CloudKitConfig,
  status: string,
  marker?: string | null
) {
  const result = await queryRecords(db, 'SharedPageReport', {
    filterBy: [
      {
        fieldName: 'status',
        comparator: 'EQUALS',
        fieldValue: { value: status, type: 'STRING' }
      }
    ],
    sortBy: [{ fieldName: 'createdAt', ascending: false }],
    limit: 20,
    marker
  })
  return {
    items: result.records
      .filter((record) => record.recordType === 'SharedPageReport')
      .map(item),
    marker: result.marker
  }
}
export async function pageReportDetail(db: CloudKitConfig, id: string) {
  const record = await lookupRecord(db, 'SharedPageReport', id)
  if (!record) throw new CloudKitRequestError(404)
  const report = item(record)
  if (
    !/^[\w-]{1,128}$/u.test(report.page) ||
    !['link', 'community'].includes(report.scope)
  )
    throw new CloudKitRequestError(409)
  // Read metadata only. No encrypted payload, complete sharing link or reader-provided HTML is loaded.
  const page = await lookupRecord(db, 'PublishedPage', report.page)
  const expectedListed = report.scope === 'link' ? 0 : 1
  const modeChanged = !!page && page.fields?.listed?.value !== expectedListed
  const listingRecord =
    report.scope === 'community'
      ? await lookupRecord(db, 'Listing', `listing-${report.page}`)
      : null
  const reference = listingRecord?.fields?.page?.value as
    | { recordName?: unknown }
    | undefined
  const listing =
    !modeChanged && reference?.recordName === report.page
      ? await getListing(db, `listing-${report.page}`)
      : null
  const targetRevision = modeChanged
    ? ''
    : report.scope === 'link'
      ? (page?.recordChangeTag ?? '')
      : (listing?.revision ?? '')
  return {
    ...report,
    target: {
      exists: !!page || !!listingRecord,
      revision: targetRevision,
      modeChanged,
      changed: !!page && page.recordChangeTag !== report.pageRevision,
      owner: page?.created?.userRecordName ?? null,
      publicURL: listing?.publicURL ?? null
    }
  }
}
export async function resolvePageReport(
  db: CloudKitConfig,
  input: {
    id: string
    revision: string
    action: 'dismiss' | 'remove' | 'unavailable'
    targetRevision?: string
  },
  actor: string
) {
  const report = await pageReportDetail(db, input.id)
  if (
    !input.revision ||
    report.revision !== input.revision ||
    !['open', 'removing'].includes(report.status)
  )
    throw new CloudKitRequestError(409)
  if (
    report.status === 'removing' &&
    input.action === 'dismiss' &&
    (!report.target.exists || report.target.revision === report.removalRevision)
  )
    throw new CloudKitRequestError(409)
  if (
    input.action === 'remove' &&
    (!report.target.exists ||
      !input.targetRevision ||
      report.target.revision !== input.targetRevision)
  )
    throw new CloudKitRequestError(409)
  if (
    report.status === 'removing' &&
    input.action === 'remove' &&
    input.targetRevision !== report.removalRevision
  )
    throw new CloudKitRequestError(409)
  if (input.action === 'unavailable' && report.target.exists)
    throw new CloudKitRequestError(409)
  let revision = report.revision
  if (input.action === 'remove') {
    // Claim the report before deleting. A competing dismissal loses its report CAS and cannot race a removal.
    const [claimed] = await modifyRecords(db, [
      {
        operationType: 'update',
        record: {
          recordName: report.id,
          recordChangeTag: report.revision,
          fields: {
            status: { value: 'removing' },
            removalRevision: { value: input.targetRevision }
          }
        }
      }
    ])
    if (!claimed?.recordChangeTag) throw new CloudKitRequestError(502)
    revision = claimed.recordChangeTag
  }
  await modifyRecords(db, [
    {
      operationType: 'create',
      record: {
        recordType: 'CommunityAudit',
        recordName: `audit-${randomUUID()}`,
        fields: {
          actor: { value: `cms:${actor}` },
          action: { value: `page-report.${input.action}.requested` },
          target: { value: report.id },
          createdAt: { value: Date.now(), type: 'TIMESTAMP' }
        }
      }
    }
  ])
  if (input.action === 'remove') {
    if (report.scope === 'link')
      await removeLinkShare(db, report.page, input.targetRevision!)
    else
      await unpublishReview(db, `listing-${report.page}`, input.targetRevision!)
  }
  const status =
    input.action === 'remove'
      ? 'removed'
      : input.action === 'dismiss'
        ? 'dismissed'
        : 'unavailable'
  await modifyRecords(db, [
    {
      operationType: 'update',
      record: {
        recordName: report.id,
        recordChangeTag: revision,
        fields: {
          status: { value: status },
          resolvedAt: { value: Date.now(), type: 'TIMESTAMP' },
          resolvedBy: { value: `cms:${actor}` }
        }
      }
    }
  ])
  return { ok: true, status }
}
