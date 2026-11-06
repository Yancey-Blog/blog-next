import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.stubEnv('ADMIN_EMAILS', 'admin@example.com')
vi.mock('@/lib/hikki/review-service', () => ({
  listPendingReviews: vi.fn().mockResolvedValue({ items: [], marker: null }),
  listPublishedListings: vi.fn(),
  getReview: vi.fn(),
  getListing: vi.fn(),
  reviewAssetURL: vi.fn(),
  approveReview: vi.fn(),
  rejectReview: vi.fn(),
  unpublishReview: vi.fn()
}))
vi.mock('@/lib/hikki/config', () => ({ hikkiConfig: () => ({}) }))
import { createTRPCRouter, type createTRPCContext } from '@/lib/trpc/init'
import { hikkiRouter } from '@/lib/trpc/routers/hikki'
type Context = Awaited<ReturnType<typeof createTRPCContext>>
const router = createTRPCRouter({ hikki: hikkiRouter })
const caller = (email?: string, verified = true) =>
  router.createCaller({
    session: email ? { id: 'session' } : null,
    user: email ? { id: 'user', email, emailVerified: verified } : undefined
  } as unknown as Context)
describe('Hikki CMS permissions', () => {
  it('blocks anonymous access to content, attachments, devices and decisions', async () => {
    const api = caller().hikki
    await expect(api.linkShares()).rejects.toThrow('UNAUTHORIZED')
    await expect(api.reports({ status: 'open' })).rejects.toThrow(
      'UNAUTHORIZED'
    )
    const reportId = 'page-report-22222222-2222-2222-2222-222222222222'
    await expect(api.reportDetail({ id: reportId })).rejects.toThrow(
      'UNAUTHORIZED'
    )
    await expect(
      api.resolveReport({ id: reportId, revision: '1', action: 'dismiss' })
    ).rejects.toThrow('UNAUTHORIZED')
    await expect(
      api.removeLinkShare({ id: 'private-link', revision: '1' })
    ).rejects.toThrow('UNAUTHORIZED')
    await expect(
      api.preview({ id: 'review-a', revision: '1', published: false })
    ).rejects.toThrow('UNAUTHORIZED')
    await expect(api.serverIdentity()).rejects.toThrow('UNAUTHORIZED')
    await expect(api.queue()).rejects.toThrow('UNAUTHORIZED')
    await expect(
      api.detail({ id: 'review-a', published: false })
    ).rejects.toThrow('UNAUTHORIZED')
    await expect(
      api.asset({ id: 'review-a', index: 0, revision: '1' })
    ).rejects.toThrow('UNAUTHORIZED')
    await expect(api.devices()).rejects.toThrow('UNAUTHORIZED')
    await expect(
      api.pairDevice({
        code:
          'device-registration-ios-00000000-0000-0000-0000-000000000000.' +
          'a'.repeat(43),
        name: 'Mac'
      })
    ).rejects.toThrow('UNAUTHORIZED')
    await expect(
      api.updateDevice({
        id: 'reviewer-' + 'a'.repeat(64),
        revision: '1',
        remove: true
      })
    ).rejects.toThrow('UNAUTHORIZED')
    await expect(api.retryPush()).rejects.toThrow('UNAUTHORIZED')
    await expect(
      api.decide({ id: 'review-a', action: 'approve', revision: '1' })
    ).rejects.toThrow('UNAUTHORIZED')
  })
  it('rejects calls to the removed AI settings API', async () => {
    const api = caller('admin@example.com').hikki as unknown as {
      settings: () => Promise<unknown>
      saveSettings: (input: {
        aiEnabled: boolean
        revision: null
      }) => Promise<unknown>
    }
    await expect(api.settings()).rejects.toThrow('No procedure found')
    await expect(
      api.saveSettings({ aiEnabled: true, revision: null })
    ).rejects.toThrow('No procedure found')
  })
  it('requires a reviewed revision for both decisions and attachment access', async () => {
    const api = caller('admin@example.com').hikki
    await expect(
      api.decide({ id: 'review-a', action: 'approve' } as never)
    ).rejects.toThrow()
    await expect(
      api.asset({ id: 'review-a', index: 0 } as never)
    ).rejects.toThrow()
  })
  it('reuses the current verified-email whitelist, including existing sessions', async () => {
    await expect(
      caller('removed@example.com').hikki.serverIdentity()
    ).rejects.toThrow('UNAUTHORIZED')
    await expect(
      caller('admin@example.com', false).hikki.serverIdentity()
    ).rejects.toThrow('UNAUTHORIZED')
    await expect(caller('removed@example.com').hikki.queue()).rejects.toThrow(
      'UNAUTHORIZED'
    )
    await expect(
      caller('admin@example.com', false).hikki.queue()
    ).rejects.toThrow('UNAUTHORIZED')
    expect(await caller('admin@example.com').hikki.queue()).toEqual({
      items: [],
      marker: null
    })
  })
})
