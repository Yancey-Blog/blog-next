import { copyAttachmentAssets } from './attachment-assets'
import {
  CloudKitRequestError,
  lookupRecord,
  modifyRecords,
  queryRecords,
  rereferenceAssets,
  type CloudKitConfig,
  type CloudKitField,
  type CloudKitRecord
} from './cloudkit'
import { ReviewPublicationError } from './publication-error'

export const REVIEW_RECORD_TYPE = 'ReviewSubmission'
export const LISTING_RECORD_TYPE = 'Listing'
export const PUBLISHED_RECORD_TYPE = 'PublishedPage'

export type ReviewItem = {
  id: string
  revision: string
  title: string
  excerpt: string
  plainText: string
  icon: string | null
  tags: string[]
  terms: string[]
  author: string | null
  submittedAt: number | null
  status: string
  decisionReason: string | null
  isUpdate: boolean
  fileCount: number
  publicURL: string | null
  publishedAt: number | null
}

const recordValue = (record: CloudKitRecord, key: string): unknown =>
  record.fields?.[key]?.value
const stringValue = (
  record: CloudKitRecord,
  key: string,
  fallback = ''
): string => {
  const raw = recordValue(record, key)
  return typeof raw === 'string' ? raw : fallback
}
const stringArray = (record: CloudKitRecord, key: string): string[] => {
  const raw = recordValue(record, key)
  return Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === 'string')
    : []
}
const objectValue = (
  record: CloudKitRecord,
  key: string
): Record<string, unknown> | null => {
  const raw = recordValue(record, key)
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null
}

function reviewItem(record: CloudKitRecord): ReviewItem {
  return {
    id: record.recordName,
    revision: record.recordChangeTag ?? '',
    title: stringValue(record, 'title', 'Untitled page'),
    excerpt: stringValue(record, 'excerpt'),
    plainText: stringValue(record, 'plainText'),
    icon: stringValue(record, 'icon') || null,
    tags: stringArray(record, 'tags'),
    terms: stringArray(record, 'terms'),
    author: stringValue(record, 'author') || null,
    submittedAt:
      typeof recordValue(record, 'submittedAt') === 'number'
        ? (recordValue(record, 'submittedAt') as number)
        : null,
    status: stringValue(record, 'status', 'pending'),
    decisionReason: stringValue(record, 'decisionReason') || null,
    isUpdate: !!stringValue(record, 'replaces'),
    fileCount: Array.isArray(recordValue(record, 'files'))
      ? (recordValue(record, 'files') as unknown[]).length
      : 0,
    publicURL: null,
    publishedAt:
      typeof recordValue(record, 'publishedAt') === 'number'
        ? (recordValue(record, 'publishedAt') as number)
        : null
  }
}

function field(value: unknown, type?: string) {
  return type ? { value, type } : { value }
}

export async function listPendingReviews(
  config: CloudKitConfig,
  marker?: string | null
) {
  const result = await queryRecords(config, REVIEW_RECORD_TYPE, {
    filterBy: [
      {
        fieldName: 'status',
        comparator: 'IN',
        fieldValue: { value: ['pending', 'publishing'], type: 'STRING_LIST' }
      }
    ],
    sortBy: [{ fieldName: 'submittedAt', ascending: true }],
    limit: 50,
    marker,
    desiredKeys: [
      'title',
      'excerpt',
      'tags',
      'author',
      'submittedAt',
      'status',
      'decisionReason',
      'replaces',
      'files'
    ]
  })
  return { items: result.records.map(reviewItem), marker: result.marker }
}

export async function getReview(
  config: CloudKitConfig,
  recordName: string
): Promise<ReviewItem | null> {
  const record = await lookupRecord(config, REVIEW_RECORD_TYPE, recordName)
  return record ? reviewItem(record) : null
}

export async function getListing(
  config: CloudKitConfig,
  recordName: string
): Promise<ReviewItem | null> {
  const record = await lookupRecord(config, LISTING_RECORD_TYPE, recordName)
  if (!record) return null
  const pageName = objectValue(record, 'page')?.recordName
  const page =
    typeof pageName === 'string'
      ? await lookupRecord(config, PUBLISHED_RECORD_TYPE, pageName)
      : null
  return {
    ...reviewItem(page ?? record),
    id: record.recordName,
    revision: listingRevision(record, page),
    status: 'approved',
    publicURL: typeof pageName === 'string' ? communityURL(pageName) : null,
    plainText: ''
  }
}

function listingRevision(
  listing: CloudKitRecord,
  page: CloudKitRecord | null
): string {
  return listing.recordChangeTag && (!page || page.recordChangeTag)
    ? JSON.stringify([listing.recordChangeTag, page?.recordChangeTag ?? null])
    : ''
}

function requireRevision(record: CloudKitRecord, revision: string): void {
  if (
    !revision ||
    !record.recordChangeTag ||
    record.recordChangeTag !== revision
  )
    throw new CloudKitRequestError(409)
}

export async function listPublishedListings(
  config: CloudKitConfig,
  marker?: string | null
) {
  const result = await queryRecords(config, LISTING_RECORD_TYPE, {
    marker,
    sortBy: [{ fieldName: 'publishedAt', ascending: false }],
    limit: 50,
    desiredKeys: ['title', 'excerpt', 'tags', 'author', 'publishedAt', 'page']
  })
  return {
    items: result.records.map((record) => ({
      ...reviewItem(record),
      publicURL:
        typeof objectValue(record, 'page')?.recordName === 'string'
          ? communityURL(String(objectValue(record, 'page')!.recordName))
          : null,
      status: 'approved',
      plainText: ''
    })),
    marker: result.marker
  }
}

/** User-facing URLs omit the internal record prefixes; existing storage names remain stable. */
function communityURL(recordName: string) {
  const publicID =
    /^page-review-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(
      recordName
    )
      ? recordName.slice(12)
      : recordName
  return `https://hikki.yancey.app/community/${encodeURIComponent(publicID)}`
}

/** Private signed assets are exposed only through protected tRPC, for the exact version being reviewed. */
export async function reviewPreview(
  config: CloudKitConfig,
  id: string,
  published: boolean,
  revision: string
) {
  let page: CloudKitRecord | null
  if (published) {
    const listing = await lookupRecord(config, LISTING_RECORD_TYPE, id)
    if (!listing) throw new CloudKitRequestError(404)
    const pageID = objectValue(listing, 'page')?.recordName
    page =
      typeof pageID === 'string'
        ? await lookupRecord(config, PUBLISHED_RECORD_TYPE, pageID)
        : null
    if (!page || listingRevision(listing, page) !== revision)
      throw new CloudKitRequestError(409)
  } else {
    page = await lookupRecord(config, REVIEW_RECORD_TYPE, id)
    if (!page) throw new CloudKitRequestError(404)
    requireRevision(page, revision)
  }
  const assetURL = (asset: unknown): string | null => {
    if (
      !asset ||
      typeof asset !== 'object' ||
      !('downloadURL' in asset) ||
      typeof asset.downloadURL !== 'string'
    )
      return null
    try {
      const url = new URL(asset.downloadURL)
      return url.protocol === 'https:' &&
        url.hostname.endsWith('.icloud-content.com') &&
        !url.username &&
        !url.password
        ? url.href
        : null
    } catch {
      return null
    }
  }
  const payloadURL = assetURL(recordValue(page, 'payloadFile'))
  const raw = recordValue(page, 'files')
  const files = Array.isArray(raw) ? raw : []
  const fileURLs = files.map(assetURL)
  if (!payloadURL || files.length > 100 || fileURLs.some((url) => !url))
    throw new CloudKitRequestError(502)
  return {
    id,
    revision,
    payloadURL,
    fileURLs: fileURLs as string[],
    tags: stringArray(page, 'tags')
  }
}

export async function reviewAssetURL(
  config: CloudKitConfig,
  recordName: string,
  index: number,
  revision: string
): Promise<string | null> {
  if (!Number.isInteger(index) || index < 0 || index > 49) return null
  const record = await lookupRecord(config, REVIEW_RECORD_TYPE, recordName)
  if (!record) return null
  requireRevision(record, revision)
  const raw = recordValue(record, 'files')
  const files = Array.isArray(raw) ? raw : []
  const file = files[index]
  if (!file || typeof file !== 'object') return null
  const downloadURL = (file as { downloadURL?: unknown }).downloadURL
  return typeof downloadURL === 'string' ? downloadURL : null
}

/** Publication uses one stable public record. Pending/rejected snapshots never overwrite it. */
export async function approveReview(
  config: CloudKitConfig,
  recordName: string,
  revision: string
): Promise<void> {
  let stage = 'loading the submission'
  let diagnostic = ''
  try {
    const review = await lookupRecord(config, REVIEW_RECORD_TYPE, recordName)
    if (!review) throw new CloudKitRequestError(404)
    requireRevision(review, revision)
    stage = 'validating the viewed revision'
    const status = stringValue(review, 'status')
    if (status !== 'pending' && status !== 'publishing')
      throw new CloudKitRequestError(409)
    const previousID = stringValue(review, 'replaces')
    let pageName = `page-${recordName}`
    if (previousID) {
      const previous = await lookupRecord(
        config,
        REVIEW_RECORD_TYPE,
        previousID
      )
      if (
        !previous ||
        previous.created?.userRecordName !== review.created?.userRecordName ||
        !review.created?.userRecordName ||
        (status === 'pending' && stringValue(previous, 'status') !== 'approved')
      )
        throw new CloudKitRequestError(409)
      pageName =
        stringValue(previous, 'publicPageRecordName') || `page-${previousID}`
    }
    const listingName = `listing-${pageName}`
    const page = await lookupRecord(config, PUBLISHED_RECORD_TYPE, pageName)
    const listing = await lookupRecord(config, LISTING_RECORD_TYPE, listingName)
    const publishedReview = page ? stringValue(page, 'reviewRecordName') : ''
    const alreadyWritten = publishedReview === recordName
    if (alreadyWritten && stringValue(page!, 'reviewRevision') !== revision)
      throw new CloudKitRequestError(409)
    if (previousID) {
      // The last approved revision must still be current. This also rejects forged parent/page fields.
      if (
        !page ||
        !listing ||
        objectValue(listing, 'page')?.recordName !== pageName ||
        (!alreadyWritten &&
          (publishedReview ||
            (pageName === `page-${previousID}` ? previousID : '')) !==
            previousID)
      )
        throw new CloudKitRequestError(409)
    } else if (
      (page || listing) &&
      !(status === 'publishing' && alreadyWritten)
    ) {
      throw new CloudKitRequestError(409)
    }
    if (!review.recordChangeTag) throw new CloudKitRequestError(502)
    // Claim before any public write. A retry can finish a publishing revision after a partial failure.
    let claimed = review
    if (status === 'pending') {
      ;[claimed] = await modifyRecords(config, [
        {
          operationType: 'update',
          record: {
            recordType: REVIEW_RECORD_TYPE,
            recordName,
            recordChangeTag: review.recordChangeTag,
            fields: {
              status: field('publishing', 'STRING'),
              publicPageRecordName: field(pageName, 'STRING')
            }
          }
        }
      ])
    }
    const fileCount = Array.isArray(recordValue(review, 'files'))
      ? (recordValue(review, 'files') as unknown[]).length
      : 0
    stage = 'copying the attachments'
    // Re-reference the scalar snapshot; CloudKit rejects re-referencing an ASSET_LIST field.
    const reused = alreadyWritten
      ? []
      : await rereferenceAssets(config, recordName, ['payloadFile'])
    const payload = writableAsset(reused[0])
    const files =
      alreadyWritten || !fileCount
        ? []
        : await copyAttachmentAssets(
            config,
            pageName,
            recordValue(review, 'files') as unknown[]
          )
    if (!alreadyWritten && (!payload || files.length !== fileCount)) {
      diagnostic = `Expected ${fileCount} attachments; received ${files.length}.`
      throw new CloudKitRequestError(502)
    }
    // The asset API reads by record name. Reject a source edited while assets were copied.
    const source = await lookupRecord(config, REVIEW_RECORD_TYPE, recordName)
    if (!source) throw new CloudKitRequestError(409)
    requireRevision(source, claimed.recordChangeTag ?? '')
    const title = stringValue(review, 'title', 'Untitled page'),
      icon = stringValue(review, 'icon'),
      excerpt = stringValue(review, 'excerpt'),
      author = stringValue(review, 'author')
    const tags = stringArray(review, 'tags'),
      terms = stringArray(review, 'terms')
    const publishedAt =
      typeof recordValue(page ?? review, 'publishedAt') === 'number'
        ? recordValue(page ?? review, 'publishedAt')
        : Date.now()
    const publicFields = {
      version: field(1, 'INT64'),
      bytes: field(
        typeof recordValue(review, 'bytes') === 'number'
          ? recordValue(review, 'bytes')
          : 0,
        'INT64'
      ),
      // Asset receipts are write values; download URLs are read-only metadata.
      payloadFile: field(payload),
      ...(files.length || page ? { files: field(files) } : {}),
      listed: field(1, 'INT64'),
      reviewRecordName: field(recordName, 'STRING'),
      reviewRevision: field(claimed.recordChangeTag, 'STRING'),
      title: field(title, 'STRING'),
      excerpt: field(excerpt, 'STRING'),
      ...(tags.length || page ? { tags: field(tags, 'STRING_LIST') } : {}),
      ...(terms.length || page ? { terms: field(terms, 'STRING_LIST') } : {}),
      icon: field(icon, 'STRING'),
      author: field(author, 'STRING'),
      publishedAt: field(publishedAt, 'TIMESTAMP')
    }
    stage = 'writing the public snapshot'
    if (!alreadyWritten) {
      // CAS is the content commit. A losing concurrent approval cannot overwrite a newer accepted revision.
      try {
        await modifyRecords(config, [
          {
            operationType: page ? 'update' : 'create',
            record: {
              recordType: PUBLISHED_RECORD_TYPE,
              recordName: pageName,
              ...(page ? { recordChangeTag: page.recordChangeTag } : {}),
              fields: publicFields
            }
          }
        ])
      } catch (cause) {
        if (cause instanceof CloudKitRequestError && cause.status === 409) {
          const observed = await lookupRecord(
            config,
            PUBLISHED_RECORD_TYPE,
            pageName
          )
          if (
            stringValue(
              observed ?? {
                recordType: PUBLISHED_RECORD_TYPE,
                recordName: pageName
              },
              'reviewRecordName'
            ) !== recordName &&
            claimed.recordChangeTag
          ) {
            await modifyRecords(config, [
              {
                operationType: 'update',
                record: {
                  recordName,
                  recordChangeTag: claimed.recordChangeTag,
                  fields: { status: field('pending', 'STRING') }
                }
              }
            ])
          }
        }
        throw cause
      }
    }
    // An update keeps the same URL and discovery entry. If this write fails, the old Listing remains and retry repairs its metadata.
    stage = 'updating the community listing'
    const currentListing = await lookupRecord(
      config,
      LISTING_RECORD_TYPE,
      listingName
    )
    await modifyRecords(config, [
      {
        operationType: currentListing ? 'update' : 'create',
        record: {
          recordType: LISTING_RECORD_TYPE,
          recordName: listingName,
          ...(currentListing
            ? { recordChangeTag: currentListing.recordChangeTag }
            : {}),
          fields: {
            title: field(title, 'STRING'),
            excerpt: field(excerpt, 'STRING'),
            icon: field(icon, 'STRING'),
            author: field(author, 'STRING'),
            ...(tags.length || currentListing
              ? { tags: field(tags, 'STRING_LIST') }
              : {}),
            ...(terms.length || currentListing
              ? { terms: field(terms, 'STRING_LIST') }
              : {}),
            publishedAt: field(publishedAt, 'TIMESTAMP'),
            page: field({ recordName: pageName, action: 'NONE' }, 'REFERENCE')
          }
        }
      }
    ])
    stage = 'saving the final decision'
    const current = await lookupRecord(config, REVIEW_RECORD_TYPE, recordName)
    if (
      !current?.recordChangeTag ||
      stringValue(current, 'status') !== 'publishing' ||
      current.recordChangeTag !== claimed.recordChangeTag
    )
      throw new CloudKitRequestError(409)
    await modifyRecords(config, [
      {
        operationType: 'update',
        record: {
          recordType: REVIEW_RECORD_TYPE,
          recordName,
          recordChangeTag: current.recordChangeTag,
          fields: {
            status: field('approved', 'STRING'),
            publicPageRecordName: field(pageName, 'STRING'),
            decidedAt: field(Date.now(), 'TIMESTAMP')
          }
        }
      }
    ])
  } catch (cause) {
    throw new ReviewPublicationError(stage, cause, diagnostic)
  }
}

export async function rejectReview(
  config: CloudKitConfig,
  recordName: string,
  reason: string,
  revision: string
): Promise<void> {
  const trimmedReason = reason.trim()
  if (!trimmedReason || trimmedReason.length > 1000)
    throw new CloudKitRequestError(400)
  const review = await lookupRecord(config, REVIEW_RECORD_TYPE, recordName)
  if (!review) throw new CloudKitRequestError(404)
  requireRevision(review, revision)
  if (stringValue(review, 'status', 'pending') !== 'pending')
    throw new CloudKitRequestError(409)
  await modifyRecords(config, [
    {
      operationType: 'update',
      record: {
        recordType: REVIEW_RECORD_TYPE,
        recordName,
        ...(review.recordChangeTag
          ? { recordChangeTag: review.recordChangeTag }
          : {}),
        fields: {
          status: field('rejected', 'STRING'),
          decisionReason: field(trimmedReason, 'STRING'),
          decidedAt: field(Date.now(), 'TIMESTAMP')
        }
      }
    }
  ])
}

export async function unpublishReview(
  config: CloudKitConfig,
  recordName: string,
  revision: string
): Promise<void> {
  const listing = await lookupRecord(config, LISTING_RECORD_TYPE, recordName)
  if (!listing) throw new CloudKitRequestError(404)
  const page = objectValue(listing, 'page')
  const pageRecordName =
    page && typeof page.recordName === 'string' ? page.recordName : ''
  if (!pageRecordName) throw new CloudKitRequestError(409)
  const publicRecord = await lookupRecord(
    config,
    PUBLISHED_RECORD_TYPE,
    pageRecordName
  )
  if (!revision || listingRevision(listing, publicRecord) !== revision)
    throw new CloudKitRequestError(409)
  const sourceReview = publicRecord
    ? stringValue(publicRecord, 'reviewRecordName')
    : ''
  const published = sourceReview
    ? await lookupRecord(config, REVIEW_RECORD_TYPE, sourceReview)
    : null
  const publishing =
    published && stringValue(published, 'status') === 'publishing'
  if (
    publishing &&
    stringValue(publicRecord!, 'reviewRevision') === published.recordChangeTag
  )
    throw new CloudKitRequestError(409)
  // Persist withdrawal before cleanup, so a failed Listing delete cannot lose the source revision.
  if (
    published?.recordChangeTag &&
    (stringValue(published, 'status') === 'approved' || publishing)
  )
    await modifyRecords(config, [
      {
        operationType: 'update',
        record: {
          recordName: published.recordName,
          recordChangeTag: published.recordChangeTag,
          fields: { status: field('withdrawn', 'STRING') }
        }
      }
    ])
  // Delete content first: a concurrent approval must lose its page CAS before discovery changes.
  // Default public zones do not support atomic multi-record writes.
  if (publicRecord)
    await modifyRecords(config, [
      {
        operationType: 'delete',
        record: {
          recordName: pageRecordName,
          recordChangeTag: publicRecord.recordChangeTag
        }
      }
    ])
  await modifyRecords(config, [
    {
      operationType: 'delete',
      record: { recordName, recordChangeTag: listing.recordChangeTag }
    }
  ])
}

function assetValue(asset: unknown): unknown {
  if (Array.isArray(asset)) return asset
  if (!asset || typeof asset !== 'object') return null
  const value = asset as { value?: unknown; singleFile?: unknown }
  return value.value ?? value.singleFile ?? asset
}

/** Only Apple's writable asset receipt keys may enter a records/modify request. */
function writableAsset(asset: unknown): Record<string, unknown> | null {
  const value = assetValue(asset)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (
    typeof raw.fileChecksum !== 'string' ||
    !raw.fileChecksum ||
    typeof raw.receipt !== 'string' ||
    !raw.receipt ||
    typeof raw.size !== 'number' ||
    !Number.isSafeInteger(raw.size) ||
    raw.size < 0
  )
    return null
  return {
    fileChecksum: raw.fileChecksum,
    receipt: raw.receipt,
    size: raw.size,
    ...(typeof raw.referenceChecksum === 'string'
      ? { referenceChecksum: raw.referenceChecksum }
      : {}),
    ...(typeof raw.wrappingKey === 'string'
      ? { wrappingKey: raw.wrappingKey }
      : {})
  }
}

export function fieldValue(
  record: CloudKitRecord,
  key: string
): CloudKitField | undefined {
  return record.fields?.[key]
}
