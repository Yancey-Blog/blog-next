import { randomBytes, randomUUID } from 'node:crypto'

import { TRPCError } from '@trpc/server'

import {
  lookupRecord,
  modifyRecords,
  queryRecords,
  type CloudKitConfig
} from './cloudkit'
import {
  digest,
  isIOSRegistration,
  registrationIdentity,
  secretMatches
} from './device-registration'

async function audit(
  db: CloudKitConfig,
  actor: string,
  action: string,
  target: string
) {
  await modifyRecords(db, [
    {
      operationType: 'create',
      record: {
        recordType: 'CommunityAudit',
        recordName: `audit-${randomUUID()}`,
        fields: {
          actor: { value: `cms:${actor}` },
          action: { value: action },
          target: { value: target },
          createdAt: { value: Date.now(), type: 'TIMESTAMP' }
        }
      }
    }
  ])
}
export async function listReviewerDevices(
  db: CloudKitConfig,
  marker?: string | null
) {
  const result = await queryRecords(db, 'CommunityReviewerDevice', {
    limit: 20,
    marker
  })
  return {
    items: await Promise.all(
      result.records
        .filter((record) => {
          const account = record.fields?.account?.value
          return (
            typeof account === 'string' &&
            record.recordName === `reviewer-${digest(account)}`
          )
        })
        .map(async (record) => {
          const account = String(record.fields!.account.value)
          const devices = await queryRecords(db, 'CommunityDevice', {
            filterBy: [
              {
                fieldName: 'account',
                comparator: 'EQUALS',
                fieldValue: { value: account, type: 'STRING' }
              }
            ],
            desiredKeys: ['registration', 'enabled', 'updatedAt'],
            limit: 100
          })
          const ios = devices.records.filter((device) =>
            isIOSRegistration(device.fields?.registration?.value)
          )
          const timestamps = ios
            .map((device) => Number(device.fields?.updatedAt?.value ?? 0))
            .filter(Number.isFinite)
          return {
            id: record.recordName,
            account: account.slice(6),
            linkedAt: record.created?.timestamp ?? null,
            enabledDevices: ios.filter(
              (device) => device.fields?.enabled?.value === 1
            ).length,
            deviceUpdatedAt: Math.max(0, ...timestamps) || null,
            moreDevices: !!devices.marker,
            name:
              typeof record.fields?.name?.value === 'string'
                ? record.fields.name.value
                : 'Hikki device',
            email:
              typeof record.fields?.email?.value === 'string'
                ? record.fields.email.value
                : '',
            enabled: record.fields?.enabled?.value === 1,
            revision: record.recordChangeTag ?? ''
          }
        })
    ),
    marker: result.marker
  }
}
export async function pairReviewer(
  db: CloudKitConfig,
  code: string,
  name: string,
  user: { id: string; email: string }
) {
  const [recordName, secret] = code.split('.')
  const record = await lookupRecord(db, 'DeviceRegistration', recordName)
  const expires = Number(record?.fields?.pairingExpiresAt?.value ?? 0)
  if (
    !isIOSRegistration(recordName) ||
    !record?.recordChangeTag ||
    expires <= Date.now() ||
    expires > Date.now() + 11 * 60_000 ||
    !secretMatches(secret, record.fields?.pairingHash?.value)
  )
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'Connection link is invalid, expired or not confirmed. Create a new link in the CMS and confirm it on your iPhone.'
    })
  const identity = registrationIdentity(record)
  const device = await lookupRecord(db, 'CommunityDevice', identity.id)
  if (
    device?.fields?.registration?.value !== recordName ||
    device.fields?.account?.value !== identity.account ||
    device.fields?.enabled?.value !== 1
  )
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Enable community notifications in Hikki before pairing.'
    })
  const id = `reviewer-${digest(identity.account)}`
  await audit(db, user.id, 'reviewer.pair.requested', id)
  // Consume once using CloudKit's revision before granting reviewer privileges.
  await modifyRecords(db, [
    {
      operationType: 'update',
      record: {
        recordName,
        recordChangeTag: record.recordChangeTag,
        fields: {
          pairingHash: { value: '' },
          pairingExpiresAt: { value: 0, type: 'TIMESTAMP' }
        }
      }
    }
  ])
  const existing = await lookupRecord(db, 'CommunityReviewerDevice', id)
  await modifyRecords(db, [
    {
      operationType: existing ? 'update' : 'create',
      record: {
        recordType: 'CommunityReviewerDevice',
        recordName: id,
        ...(existing ? { recordChangeTag: existing.recordChangeTag } : {}),
        fields: {
          device: { value: identity.id },
          account: { value: identity.account },
          actor: { value: `cms:${user.id}` },
          email: { value: user.email },
          name: { value: name },
          enabled: { value: 1, type: 'INT64' },
          updatedAt: { value: Date.now(), type: 'TIMESTAMP' }
        }
      }
    }
  ])
  return { ok: true }
}
export async function updateReviewer(
  db: CloudKitConfig,
  input: { id: string; revision: string; enabled?: boolean; remove?: boolean },
  actor: string
) {
  await audit(
    db,
    actor,
    input.remove ? 'reviewer.remove.requested' : 'reviewer.update.requested',
    input.id
  )
  await modifyRecords(db, [
    {
      operationType: input.remove ? 'delete' : 'update',
      record: {
        recordName: input.id,
        recordChangeTag: input.revision,
        ...(input.remove
          ? {}
          : {
              fields: {
                enabled: { value: input.enabled ? 1 : 0, type: 'INT64' },
                updatedAt: { value: Date.now(), type: 'TIMESTAMP' }
              }
            })
      }
    }
  ])
  return { ok: true }
}
export async function queueAuthorDecision(
  db: CloudKitConfig,
  submission: string
) {
  const review = await lookupRecord(db, 'ReviewSubmission', submission)
  const owner = review?.created?.userRecordName
  const kind = review?.fields?.status?.value
  if (!owner || (kind !== 'approved' && kind !== 'rejected')) return null
  const reason =
    kind === 'rejected' &&
    typeof review?.fields?.decisionReason?.value === 'string'
      ? review.fields.decisionReason.value
      : ''
  const title =
    typeof review?.fields?.title?.value === 'string'
      ? review.fields.title.value
      : ''
  const account = `cloud:${owner}`,
    id = `notification-${digest(`${account}:${kind}:${submission}`)}`
  if (!(await lookupRecord(db, 'CommunityNotification', id))) {
    try {
      await modifyRecords(db, [
        {
          operationType: 'create',
          record: {
            recordType: 'CommunityNotification',
            recordName: id,
            fields: {
              account: { value: account },
              kind: { value: kind },
              reason: { value: reason },
              title: { value: title },
              submission: { value: submission },
              status: { value: 'pending' },
              nextAttemptAt: { value: 0, type: 'TIMESTAMP' },
              createdAt: { value: Date.now(), type: 'TIMESTAMP' }
            }
          }
        }
      ])
    } catch (error) {
      if (!(await lookupRecord(db, 'CommunityNotification', id))) throw error
    }
  }
  return id
}
export async function dispatchNotification(
  db: CloudKitConfig,
  id: string,
  fetcher: typeof fetch = fetch
) {
  const record = await lookupRecord(db, 'CommunityNotification', id)
  if (!record || !record.recordChangeTag) return false
  if (
    ['delivered', 'cancelled', 'expired'].includes(
      String(record.fields?.status?.value)
    )
  )
    return true
  if (
    record.fields?.status?.value === 'delivering' &&
    Date.now() - Number(record.fields?.updatedAt?.value ?? 0) < 60_000
  )
    return false
  const secret = randomBytes(32).toString('base64url')
  await modifyRecords(db, [
    {
      operationType: 'update',
      record: {
        recordName: id,
        recordChangeTag: record.recordChangeTag,
        fields: { dispatchHash: { value: digest(secret) } }
      }
    }
  ])
  // Fixed origin: administrators cannot redirect dispatch credentials to a supplied URL.
  try {
    const response = await fetcher(
      'https://hikki.yancey.app/api/notifications/deliver',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, secret }),
        signal: AbortSignal.timeout(12_000),
        redirect: 'error'
      }
    )
    const body = await response.json().catch(() => null)
    return response.ok && body?.delivered === true
  } catch {
    return false
  }
}
export async function retryPush(db: CloudKitConfig) {
  const reviews = await queryRecords(db, 'ReviewSubmission', {
    sortBy: [{ fieldName: 'submittedAt', ascending: false }],
    limit: 5
  })
  const reviewers = await queryRecords(db, 'CommunityReviewerDevice', {
    filterBy: [
      {
        fieldName: 'enabled',
        comparator: 'EQUALS',
        fieldValue: { value: 1, type: 'INT64' }
      }
    ],
    limit: 10
  })
  // Bound recovery work so one CMS request never scans the entire public database.
  const recent = reviews.records.filter(
    (review) =>
      Date.now() - Number(review.fields?.submittedAt?.value ?? 0) <=
      14 * 86_400_000
  )
  await Promise.all(
    recent
      .filter((review) =>
        ['approved', 'rejected'].includes(String(review.fields?.status?.value))
      )
      .map((review) => queueAuthorDecision(db, review.recordName))
  )
  const candidates = recent
    .filter((review) => review.fields?.status?.value === 'pending')
    .flatMap((review) =>
      reviewers.records
        .filter((reviewer) => {
          const account = reviewer.fields?.account?.value
          return (
            typeof account === 'string' &&
            reviewer.recordName === `reviewer-${digest(account)}`
          )
        })
        .map((reviewer) => ({ review, reviewer }))
    )
    .slice(0, 10)
  await Promise.all(
    candidates.map(async ({ review, reviewer }) => {
      const account = `reviewer:${reviewer.recordName}`,
        id = `notification-${digest(`${account}:pending:${review.recordName}`)}`
      if (!(await lookupRecord(db, 'CommunityNotification', id)))
        await modifyRecords(db, [
          {
            operationType: 'create',
            record: {
              recordType: 'CommunityNotification',
              recordName: id,
              fields: {
                account: { value: account },
                kind: { value: 'pending' },
                submission: { value: review.recordName },
                status: { value: 'pending' },
                createdAt: { value: Date.now(), type: 'TIMESTAMP' },
                nextAttemptAt: { value: 0, type: 'TIMESTAMP' }
              }
            }
          }
        ])
    })
  )
  const batches = await Promise.all(
    ['pending', 'delivering'].map((status) =>
      queryRecords(db, 'CommunityNotification', {
        filterBy: [
          {
            fieldName: 'status',
            comparator: 'EQUALS',
            fieldValue: { value: status, type: 'STRING' }
          },
          {
            fieldName: 'nextAttemptAt',
            comparator: 'LESS_THAN_OR_EQUALS',
            fieldValue: { value: Date.now(), type: 'TIMESTAMP' }
          }
        ],
        sortBy: [{ fieldName: 'createdAt', ascending: true }],
        limit: 5
      })
    )
  )
  const pending = batches.flatMap((batch) => batch.records)
  const outcomes = await Promise.all(
    pending.map((record) =>
      dispatchNotification(db, record.recordName).catch(() => false)
    )
  )
  return {
    attempted: pending.length,
    accepted: outcomes.filter(Boolean).length
  }
}
