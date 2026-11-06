import { randomUUID } from 'node:crypto'

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { CloudKitRequestError, modifyRecords } from '@/lib/hikki/cloudkit'
import { hikkiConfig } from '@/lib/hikki/config'
import { listLinkShares, removeLinkShare } from '@/lib/hikki/link-shares'
import {
  listReviewerDevices,
  pairReviewer,
  updateReviewer,
  queueAuthorDecision,
  dispatchNotification,
  retryPush
} from '@/lib/hikki/notifications'
import {
  listPageReports,
  pageReportDetail,
  resolvePageReport
} from '@/lib/hikki/page-reports'
import {
  approveReview,
  getListing,
  getReview,
  listPendingReviews,
  listPublishedListings,
  rejectReview,
  reviewAssetURL,
  reviewPreview,
  unpublishReview
} from '@/lib/hikki/review-service'
import { serverIdentity } from '@/lib/hikki/server-identity'

import { protectedProcedure } from '../init'

const recordID = z.string().regex(/^[\w-]{1,128}$/u)
const revision = z.string().min(1).max(1024)
async function execute<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (cause) {
    if (cause instanceof TRPCError) throw cause
    const cloudKit = cause instanceof CloudKitRequestError ? cause : null
    const authenticationFailure =
      cloudKit &&
      (cloudKit.status === 401 ||
        cloudKit.serverCode === 'AUTHENTICATION_FAILED')
    const permissionFailure =
      cloudKit &&
      (cloudKit.status === 403 || cloudKit.serverCode === 'ACCESS_DENIED')
    throw new TRPCError({
      code:
        cause instanceof CloudKitRequestError && cause.status === 409
          ? 'CONFLICT'
          : 'BAD_GATEWAY',
      message: authenticationFailure
        ? 'CloudKit server authentication failed. Check the CMS key ID and matching private key.'
        : permissionFailure
          ? 'CloudKit denied CMS access. Check the server key owner’s HikkiModerator role in the configured environment.'
          : cloudKit?.queryReason
            ? `CloudKit rejected the request: ${cloudKit.queryReason}`
            : cause instanceof CloudKitRequestError && cause.status === 409
              ? 'This page changed. Review the latest version before trying again.'
              : 'The Hikki operation could not be completed. Refresh before retrying.'
    })
  }
}
export const hikkiRouter = {
  reports: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(['open', 'removing', 'dismissed', 'removed', 'unavailable'])
          .default('open'),
        marker: z.string().max(4096).nullish()
      })
    )
    .query(({ input }) =>
      execute(() => listPageReports(hikkiConfig(), input.status, input.marker))
    ),
  reportDetail: protectedProcedure
    .input(z.object({ id: z.string().regex(/^page-report-[a-f0-9-]{36}$/u) }))
    .query(({ input }) =>
      execute(() => pageReportDetail(hikkiConfig(), input.id))
    ),
  resolveReport: protectedProcedure
    .input(
      z.object({
        id: z.string().regex(/^page-report-[a-f0-9-]{36}$/u),
        revision,
        action: z.enum(['dismiss', 'remove', 'unavailable']),
        targetRevision: z.string().min(1).max(2048).optional()
      })
    )
    .mutation(({ input, ctx }) =>
      execute(() => resolvePageReport(hikkiConfig(), input, ctx.user.id))
    ),
  linkShares: protectedProcedure
    .input(z.object({ marker: z.string().max(4096).nullish() }).optional())
    .query(({ input }) =>
      execute(() => listLinkShares(hikkiConfig(), input?.marker))
    ),
  removeLinkShare: protectedProcedure
    .input(z.object({ id: recordID, revision }))
    .mutation(({ input, ctx }) =>
      execute(async () => {
        const config = hikkiConfig()
        await modifyRecords(config, [
          {
            operationType: 'create',
            record: {
              recordType: 'CommunityAudit',
              recordName: `audit-${randomUUID()}`,
              fields: {
                actor: { value: `cms:${ctx.user.id}` },
                action: { value: 'link-share.remove.requested' },
                target: { value: input.id },
                createdAt: { value: Date.now(), type: 'TIMESTAMP' }
              }
            }
          }
        ])
        return removeLinkShare(config, input.id, input.revision)
      })
    ),
  serverIdentity: protectedProcedure.query(() =>
    execute(() => serverIdentity(hikkiConfig()))
  ),
  devices: protectedProcedure
    .input(z.object({ marker: z.string().max(4096).nullish() }).optional())
    .query(({ input }) =>
      execute(() => listReviewerDevices(hikkiConfig(), input?.marker))
    ),
  preview: protectedProcedure
    .input(z.object({ id: recordID, revision, published: z.boolean() }))
    .query(({ input }) =>
      execute(() =>
        reviewPreview(hikkiConfig(), input.id, input.published, input.revision)
      )
    ),
  pairDevice: protectedProcedure
    .input(
      z.object({
        code: z
          .string()
          .regex(/^device-registration-ios-[a-z0-9-]{36}\.[A-Za-z0-9_-]{43}$/),
        name: z.string().trim().min(1).max(80)
      })
    )
    .mutation(({ input, ctx }) =>
      execute(() =>
        pairReviewer(hikkiConfig(), input.code, input.name, ctx.user)
      )
    ),
  updateDevice: protectedProcedure
    .input(
      z
        .object({
          id: z.string().regex(/^reviewer-[a-f0-9]{64}$/),
          revision: z.string().min(1),
          enabled: z.boolean().optional(),
          remove: z.boolean().optional()
        })
        .refine((input) => input.remove || typeof input.enabled === 'boolean')
    )
    .mutation(({ input, ctx }) =>
      execute(() => updateReviewer(hikkiConfig(), input, ctx.user.id))
    ),
  retryPush: protectedProcedure.mutation(() =>
    execute(() => retryPush(hikkiConfig()))
  ),
  queue: protectedProcedure
    .input(z.object({ marker: z.string().max(4096).nullish() }).optional())
    .query(({ input }) =>
      execute(() => listPendingReviews(hikkiConfig(), input?.marker))
    ),
  listings: protectedProcedure
    .input(z.object({ marker: z.string().max(4096).nullish() }).optional())
    .query(({ input }) =>
      execute(() => listPublishedListings(hikkiConfig(), input?.marker))
    ),
  detail: protectedProcedure
    .input(z.object({ id: recordID, published: z.boolean() }))
    .query(({ input }) =>
      execute(() =>
        input.published
          ? getListing(hikkiConfig(), input.id)
          : getReview(hikkiConfig(), input.id)
      )
    ),
  // Asset URLs are returned only through the protected tRPC boundary; they never enter public pages.
  asset: protectedProcedure
    .input(
      z.object({
        id: recordID,
        index: z.number().int().min(0).max(49),
        revision
      })
    )
    .query(({ input }) =>
      execute(async () => ({
        url: await reviewAssetURL(
          hikkiConfig(),
          input.id,
          input.index,
          input.revision
        )
      }))
    ),
  decide: protectedProcedure
    .input(
      z
        .object({
          id: recordID,
          revision,
          action: z.enum(['approve', 'reject', 'unpublish']),
          reason: z.string().trim().max(1000).optional()
        })
        .refine((input) => input.action !== 'reject' || !!input.reason, {
          message: 'A rejection reason is required.',
          path: ['reason']
        })
    )
    .mutation(({ input, ctx }) =>
      execute(async () => {
        const config = hikkiConfig()
        await modifyRecords(config, [
          {
            operationType: 'create',
            record: {
              recordType: 'CommunityAudit',
              recordName: `audit-${randomUUID()}`,
              fields: {
                actor: { value: `cms:${ctx.user.id}` },
                action: { value: `${input.action}.requested` },
                target: { value: input.id },
                createdAt: { value: Date.now(), type: 'TIMESTAMP' }
              }
            }
          }
        ])
        if (input.action === 'reject')
          await rejectReview(config, input.id, input.reason!, input.revision)
        else if (input.action === 'approve')
          await approveReview(config, input.id, input.revision)
        else await unpublishReview(config, input.id, input.revision)
        let notificationQueued = false
        if (input.action === 'approve' || input.action === 'reject') {
          try {
            const id = await queueAuthorDecision(config, input.id)
            notificationQueued = !!id
            if (id) await dispatchNotification(config, id).catch(() => false)
          } catch {
            /* Publication succeeded. Notification recovery is separate from the review decision. */
          }
        }
        return { ok: true, notificationQueued }
      })
    )
}
