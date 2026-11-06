import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { createAuthMiddleware } from 'better-auth/api'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  adminDatabaseHooks,
  assertAdminIdentity
} from '@/lib/auth/provisioning'

afterEach(() => vi.unstubAllEnvs())
async function fixture(email: string, gate: boolean) {
  const records: Record<string, any[]> = {
    user: [],
    session: [],
    account: [],
    verification: []
  }
  const observedLoginPaths: string[] = []
  const auth = betterAuth({
    baseURL: 'http://localhost:3000',
    secret: 'fixture-secret-for-local-tests-only-123456',
    database: memoryAdapter(records),
    logger: { disabled: true },
    socialProviders: {
      google: { clientId: 'fixture-google', clientSecret: 'fixture-secret' },
      github: { clientId: 'fixture-github', clientSecret: 'fixture-secret' }
    },
    ...(gate
      ? {
          user: {
            validateUserInfo: ({ user }: { user: any }) =>
              assertAdminIdentity(user)
          },
          databaseHooks: adminDatabaseHooks(async (id) =>
            records.user.find((user) => user.id === id)
          )
        }
      : {
          hooks: {
            after: createAuthMiddleware(async (ctx) => {
              if (ctx.context.newSession?.user) {
                observedLoginPaths.push(ctx.path)
                if (
                  ctx.path === '/sign-in/social' ||
                  ctx.path === '/passkey/verify-authentication'
                )
                  assertAdminIdentity(ctx.context.newSession.user)
              }
            })
          }
        })
  })
  const context = await auth.$context
  for (const provider of context.socialProviders) {
    provider.validateAuthorizationCode = async () => ({
      accessToken: 'fixture-access-token'
    })
    provider.getUserInfo = async () => ({
      user: {
        name: 'Fixture',
        email,
        emailVerified: true
      },
      data: { id: 'fixture-provider-user', sub: 'fixture-provider-user' }
    })
  }
  return { auth, records, observedLoginPaths }
}
async function callback(
  auth: Awaited<ReturnType<typeof fixture>>['auth'],
  provider: 'google' | 'github'
) {
  const start = await auth.handler(
    new Request('http://localhost:3000/api/auth/sign-in/social', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000'
      },
      body: JSON.stringify({
        provider,
        callbackURL: 'http://localhost:3000/admin',
        disableRedirect: true
      })
    })
  )
  const payload = await start.json()
  const state = new URL(payload.url).searchParams.get('state')!
  const cookies = start.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
  return auth.handler(
    new Request(
      `http://localhost:3000/api/auth/callback/${provider}?code=fixture-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookies } }
    )
  )
}
describe('OAuth callback provisioning with real Better Auth routing', () => {
  it.each(['google', 'github'] as const)(
    'rejects a foreign %s identity before user/session persistence',
    async (provider) => {
      vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
      const { auth, records } = await fixture('stranger@example.com', true)
      const response = await callback(auth, provider)
      expect(response.headers.get('location')).not.toBe(
        'http://localhost:3000/admin'
      )
      expect(records.user).toHaveLength(0)
      expect(records.session).toHaveLength(0)
      expect(records.account).toHaveLength(0)
    }
  )
  it('still permits a verified whitelisted OAuth identity', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    const { auth, records } = await fixture('owner@example.com', true)
    const response = await callback(auth, 'google')
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin')
    expect(records.user).toHaveLength(1)
    expect(records.session).toHaveLength(1)
  })
  it('rejects historical users at the real session adapter boundary shared by Passkey', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    const { auth, records } = await fixture('stranger@example.com', true)
    records.user.push({
      id: 'legacy',
      name: 'Historical identity',
      email: 'stranger@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    const context = await auth.$context
    await expect(
      context.internalAdapter.createSession('legacy')
    ).rejects.toThrow('Only authorized')
    expect(records.session).toHaveLength(0)
    expect(records.user).toHaveLength(1)
  })
  it('demonstrates that callback routing can create a session when provisioning gates are absent', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    const { auth, records, observedLoginPaths } = await fixture(
      'stranger@example.com',
      false
    )
    const response = await callback(auth, 'google')
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin')
    expect(
      response.headers
        .getSetCookie()
        .some((cookie) => cookie.startsWith('better-auth.session_token='))
    ).toBe(true)
    expect(records.user).toHaveLength(1)
    expect(records.session).toHaveLength(1)
    expect(observedLoginPaths).toContain('/callback/:id')
  })
})
