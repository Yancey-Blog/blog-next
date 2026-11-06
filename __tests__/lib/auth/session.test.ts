import { afterEach, describe, expect, it, vi } from 'vitest'
const context = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers())
}))
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: context.get } } }))
import { getSession, requireAuth } from '@/lib/auth/session'
afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})
describe('server authorization for pages and AI API', () => {
  it('rejects a previously issued foreign session instead of accepting any login', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    context.get.mockResolvedValue({
      session: { id: 'historical-session' },
      user: { email: 'stranger@example.com', emailVerified: true }
    })
    expect(await getSession()).toBeNull()
    await expect(requireAuth()).rejects.toThrow('Unauthorized')
  })
  it('keeps valid admin sessions and rejects unverified or removed identities immediately', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    const session = {
      session: { id: 's' },
      user: { email: 'owner@example.com', emailVerified: true }
    }
    context.get.mockResolvedValue(session)
    expect(await requireAuth()).toEqual(session)
    vi.stubEnv('ADMIN_EMAILS', '')
    expect(await getSession()).toBeNull()
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    context.get.mockResolvedValue({
      ...session,
      user: { ...session.user, emailVerified: false }
    })
    expect(await getSession()).toBeNull()
  })
})
